/**
 * lib/rbac.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-Based Access Control (RBAC) Layer
 *
 * This module is the single source of truth for role enforcement across the
 * entire application.  It is deliberately framework-agnostic so that the same
 * helpers work in:
 *
 *   1. Server Components  — call `requireRole(["ADMIN"])` at the top of a page.
 *   2. Server Actions      — call inside an action function before touching the DB.
 *   3. Route Handlers      — call inside a GET/POST handler.
 *
 * How it works:
 *   Clerk provides the active user (`userId`) and their active organization
 *   (`orgId`) via `auth()`.  We then look up the Membership row in our own DB
 *   to retrieve the role we assigned (synced from Clerk via webhooks).  This
 *   ensures our DB is always the authoritative source of roles — not Clerk's
 *   metadata.
 *
 * Extending for a new SaaS:
 *   - Add new roles to the `Role` enum in schema.prisma and re-run migration.
 *   - Update `ROLE_HIERARCHY` if you want hierarchical permission checking.
 *   - The `requireRole` and `hasRole` APIs stay the same.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Re-export Role type for convenience so callers don't import from @prisma/client.
export type { Role };

// ─── Error Type ──────────────────────────────────────────────────────────────

/**
 * Thrown by `requireRole` when the user's role is not in the allowed list.
 * Catch this in Route Handlers to return a proper 403 response.
 * In Server Actions you can let it bubble up to an error boundary.
 */
export class RBACError extends Error {
  public readonly statusCode = 403;
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "RBACError";
  }
}

// ─── Context Type ─────────────────────────────────────────────────────────────

/** The resolved auth context returned by `requireRole`. */
export interface AuthContext {
  /** Local DB user ID (cuid). */
  userId: string;
  /** Clerk user ID (e.g. "user_2abc…"). */
  clerkUserId: string;
  /** Local DB organization ID (cuid). */
  orgId: string;
  /** Clerk organization ID (e.g. "org_2abc…"). */
  clerkOrgId: string;
  /** The user's role within the active organization. */
  role: Role;
}

// ─── Core Helpers ─────────────────────────────────────────────────────────────

function mapClerkOrgRoleToDbRole(orgRole?: string | null): Role {
  if (!orgRole) return "ADMIN"; // Default first user in dev org to ADMIN if unspecified
  const lower = orgRole.toLowerCase();
  if (lower.includes("admin")) return "ADMIN";
  if (lower.includes("manager")) return "MANAGER";
  return "MEMBER";
}

/**
 * Auto-provisions user, organization, and membership in local DB if webhooks
 * haven't delivered yet (e.g. during local dev).
 */
async function autoProvisionClerkMembership(
  clerkUserId: string,
  clerkOrgId: string,
  orgRole?: string | null
) {
  try {
    const user = await currentUser();
    const primaryEmail =
      user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user?.emailAddresses[0]?.emailAddress ??
      `${clerkUserId}@clerk.user`;

    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

    const dbUser = await prisma.user.upsert({
      where: { clerkId: clerkUserId },
      create: {
        clerkId: clerkUserId,
        email: primaryEmail,
        name,
        imageUrl: user?.imageUrl,
      },
      update: {
        email: primaryEmail,
        name,
        imageUrl: user?.imageUrl,
        deletedAt: null,
      },
    });

    const dbOrg = await prisma.organization.upsert({
      where: { clerkOrgId },
      create: {
        clerkOrgId,
        name: "My Organization",
      },
      update: {
        deletedAt: null,
      },
    });

    const role: Role = mapClerkOrgRoleToDbRole(orgRole);

    return await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: dbUser.id,
          organizationId: dbOrg.id,
        },
      },
      create: {
        userId: dbUser.id,
        organizationId: dbOrg.id,
        role,
      },
      update: { role },
      include: {
        user: { select: { id: true } },
        organization: { select: { id: true } },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Pure predicate — no side effects, no DB calls.
 * Use when you already have a `role` and just want to check membership.
 *
 * @example
 * if (hasRole(membership.role, ["ADMIN", "MANAGER"])) { ... }
 */
export function hasRole(role: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(role);
}

/**
 * Async guard — verifies the current user is authenticated, belongs to an
 * active organization, and holds one of the `allowedRoles` within that org.
 *
 * On failure:
 *   - Not authenticated   → redirects to /sign-in
 *   - No active org       → redirects to /dashboard (org selection)
 *   - Wrong role          → throws `RBACError` (caught by caller or error boundary)
 *
 * @param allowedRoles  Array of roles that are permitted to proceed.
 * @returns             `AuthContext` with resolved IDs and role.
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthContext> {
  const { userId: clerkUserId, orgId: clerkOrgId, orgRole } = await auth();

  // 1. Must be authenticated.
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  // 2. Must have an active organization selected.
  if (!clerkOrgId) {
    redirect("/dashboard");
  }

  // 3. Look up the user and their membership in the active org from our DB.
  let membership = await prisma.membership.findFirst({
    where: {
      user: { clerkId: clerkUserId, deletedAt: null },
      organization: { clerkOrgId, deletedAt: null },
    },
    include: {
      user: { select: { id: true } },
      organization: { select: { id: true } },
    },
  });

  // Fallback: auto-provision if webhooks haven't fired yet
  if (!membership) {
    membership = await autoProvisionClerkMembership(clerkUserId, clerkOrgId, orgRole);
  }

  if (!membership) {
    throw new RBACError("Membership not found or account deactivated. Please contact support.");
  }

  // 4. Check that the user's role is in the allowed list.
  if (!hasRole(membership.role, allowedRoles)) {
    throw new RBACError(
      `This action requires one of: ${allowedRoles.join(", ")}. Your role: ${membership.role}.`
    );
  }

  return {
    userId: membership.user.id,
    clerkUserId,
    orgId: membership.organization.id,
    clerkOrgId,
    role: membership.role,
  };
}

/**
 * Lightweight variant that returns `null` instead of throwing/redirecting.
 * Useful for conditional UI rendering in Server Components.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const { userId: clerkUserId, orgId: clerkOrgId, orgRole } = await auth();
    if (!clerkUserId || !clerkOrgId) return null;

    let membership = await prisma.membership.findFirst({
      where: {
        user: { clerkId: clerkUserId, deletedAt: null },
        organization: { clerkOrgId, deletedAt: null },
      },
      include: {
        user: { select: { id: true } },
        organization: { select: { id: true } },
      },
    });

    if (!membership) {
      membership = await autoProvisionClerkMembership(clerkUserId, clerkOrgId, orgRole);
    }

    if (!membership) return null;

    return {
      userId: membership.user.id,
      clerkUserId,
      orgId: membership.organization.id,
      clerkOrgId,
      role: membership.role,
    };
  } catch {
    return null;
  }
}
