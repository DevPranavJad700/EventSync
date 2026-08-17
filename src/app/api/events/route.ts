/**
 * app/api/events/route.ts — Events REST API
 * ─────────────────────────────────────────────────────────────────────────────
 * Authenticated REST endpoint for listing events with cursor pagination.
 *
 * GET /api/events?cursor=<base64>&limit=<n>
 *   Returns a page of events for the caller's active organization.
 *   Requires Clerk session (HTTP 401 if unauthenticated).
 *   Rate-limited: 60 requests/minute per IP (Upstash Redis in prod, in-memory fallback).
 *
 * Mutation endpoints (create, update, delete) are intentionally handled via
 * Next.js Server Actions (`dashboard/events/actions.ts`) rather than REST routes.
 * Server Actions are co-located with the Server Component tree, avoid an extra
 * HTTP round-trip, and benefit from automatic revalidation via `revalidatePath`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { listEvents } from "@/app/(dashboard)/dashboard/events/actions";
import { paginationSchema } from "@/lib/validations/event";
import { apiRateLimiter, getClientIp } from "@/lib/rate-limit";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  // 1. Rate limiting check
  const clientIp = getClientIp(req);
  const rateLimit = await apiRateLimiter.limit(clientIp);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 2. Authentication check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const params = paginationSchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await listEvents(params);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, {
      headers: {
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[GET /api/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
