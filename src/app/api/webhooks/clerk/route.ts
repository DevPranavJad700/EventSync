/**
 * app/api/webhooks/clerk/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Clerk Webhook Endpoint — Hardened Svix-Verified Event Processor
 *
 * Security & Reliability Features:
 *   1. HMAC Signature Verification — rejects unverified payloads with HTTP 400.
 *   2. Timestamp Window Replay Protection — rejects events older than 5 minutes.
 *   3. Idempotent Writes — duplicate deliveries return HTTP 200 without DB churn.
 *   4. Soft Deletes — user.deleted and organization.deleted preserve audit history.
 *   5. Structured JSON Logging — ships clean telemetry to log aggregators.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { webhookRateLimiter, getClientIp } from "@/lib/rate-limit";
import type { Role } from "@prisma/client";

// Max allowed timestamp drift in seconds (5 minutes) to prevent replay attacks
const MAX_TIMESTAMP_TOLERANCE_SECONDS = 300;

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

interface ClerkOrganizationData {
  id: string;
  name: string;
  image_url: string | null;
}

interface ClerkMembershipData {
  id: string;
  role: string;
  organization: ClerkOrganizationData;
  public_user_data: {
    user_id: string;
  };
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData | ClerkOrganizationData | ClerkMembershipData;
}

function mapClerkRoleToDbRole(clerkRole: string): Role {
  switch (clerkRole.toLowerCase()) {
    case "org:admin":
      return "ADMIN";
    case "org:manager":
    case "manager":
      return "MANAGER";
    default:
      return "MEMBER";
  }
}

export async function POST(req: Request) {
  // 0. Rate limiting check
  const clientIp = getClientIp(req);
  const rateLimit = await webhookRateLimiter.limit(clientIp);
  if (!rateLimit.success) {
    logger.warn("Webhook rate limit exceeded", { clientIp });
    return new Response("Too many requests", { status: 429 });
  }
  const rawBody = await req.text();
  const headerPayload = await headers();

  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  // 1. Mandatory Header Verification
  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn("Webhook rejected: missing Svix headers", { svixId });
    return new Response("Missing Svix headers", { status: 400 });
  }

  // 2. Timestamp Window Replay Protection
  const timestampNum = parseInt(svixTimestamp, 10);
  if (!isNaN(timestampNum)) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampNum) > MAX_TIMESTAMP_TOLERANCE_SECONDS) {
      logger.warn("Webhook rejected: timestamp outside tolerance window", {
        svixId,
        svixTimestamp,
        nowSeconds,
      });
      return new Response("Timestamp outside tolerance window", { status: 400 });
    }
  }

  // 3. Svix Signature Verification
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const wh = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.warn("Webhook signature verification failed", {
      svixId,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Invalid Svix signature", { status: 400 });
  }

  // 4. Idempotency Check via WebhookEvent Audit Log
  const existingLog = await prisma.webhookEvent.findUnique({
    where: { svixId },
  });

  if (existingLog) {
    logger.info("Webhook duplicate delivery skipped", { svixId, eventType: event.type });
    return new Response("Already processed", { status: 200 });
  }

  const { type: eventType, data } = event;
  let status = "processed";
  let error: string | undefined;

  // 5. Dispatch Event Handler
  try {
    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const userData = data as ClerkUserData;
        const primaryEmail = userData.email_addresses.find(
          (e) => e.id === userData.primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
          throw new Error(`User ${userData.id} has no primary email`);
        }

        await prisma.user.upsert({
          where: { clerkId: userData.id },
          create: {
            clerkId: userData.id,
            email: primaryEmail,
            name:
              [userData.first_name, userData.last_name]
                .filter(Boolean)
                .join(" ") || null,
            imageUrl: userData.image_url,
          },
          update: {
            email: primaryEmail,
            name:
              [userData.first_name, userData.last_name]
                .filter(Boolean)
                .join(" ") || null,
            imageUrl: userData.image_url,
            deletedAt: null, // Revive if previously soft-deleted
          },
        });
        logger.info("User synced from webhook", { clerkUserId: userData.id, eventType });
        break;
      }

      case "user.deleted": {
        const userData = data as { id: string };
        // Soft delete user record to preserve event ownership and compliance audit logs
        await prisma.user.updateMany({
          where: { clerkId: userData.id },
          data: { deletedAt: new Date() },
        });
        logger.info("User soft-deleted", { clerkUserId: userData.id });
        break;
      }

      case "organization.created":
      case "organization.updated": {
        const orgData = data as ClerkOrganizationData;
        await prisma.organization.upsert({
          where: { clerkOrgId: orgData.id },
          create: {
            clerkOrgId: orgData.id,
            name: orgData.name,
            imageUrl: orgData.image_url,
          },
          update: {
            name: orgData.name,
            imageUrl: orgData.image_url,
            deletedAt: null,
          },
        });
        logger.info("Organization synced from webhook", { clerkOrgId: orgData.id, eventType });
        break;
      }

      case "organization.deleted": {
        const orgData = data as { id: string };
        await prisma.organization.updateMany({
          where: { clerkOrgId: orgData.id },
          data: { deletedAt: new Date() },
        });
        logger.info("Organization soft-deleted", { clerkOrgId: orgData.id });
        break;
      }

      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const membershipData = data as ClerkMembershipData;
        const clerkUserId = membershipData.public_user_data.user_id;
        const clerkOrgId = membershipData.organization.id;

        const [user, organization] = await Promise.all([
          prisma.user.findUnique({ where: { clerkId: clerkUserId } }),
          prisma.organization.findUnique({ where: { clerkOrgId } }),
        ]);

        if (!user || !organization) {
          logger.warn("Membership sync skipped: user or organization not found", {
            clerkUserId,
            clerkOrgId,
          });
          status = "ignored";
          break;
        }

        const role = mapClerkRoleToDbRole(membershipData.role);

        await prisma.membership.upsert({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: organization.id,
            },
          },
          create: {
            userId: user.id,
            organizationId: organization.id,
            role,
          },
          update: { role },
        });
        logger.info("Membership synced from webhook", { clerkUserId, clerkOrgId, role });
        break;
      }

      case "organizationMembership.deleted": {
        const membershipData = data as ClerkMembershipData;
        const clerkUserId = membershipData.public_user_data.user_id;
        const clerkOrgId = membershipData.organization.id;

        const [user, organization] = await Promise.all([
          prisma.user.findUnique({ where: { clerkId: clerkUserId } }),
          prisma.organization.findUnique({ where: { clerkOrgId } }),
        ]);

        if (user && organization) {
          await prisma.membership.deleteMany({
            where: {
              userId: user.id,
              organizationId: organization.id,
            },
          });
          logger.info("Membership deleted from webhook", { clerkUserId, clerkOrgId });
        }
        break;
      }

      default:
        logger.info("Unhandled webhook event type", { eventType });
        status = "ignored";
    }
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : String(err);
    logger.error("Error processing webhook payload", { eventType, error });
  }

  // 6. Write Audit Log Entry
  await prisma.webhookEvent.create({
    data: {
      svixId,
      eventType,
      payload: JSON.parse(rawBody) as object,
      status,
      error,
    },
  });

  return new Response("OK", { status: 200 });
}
