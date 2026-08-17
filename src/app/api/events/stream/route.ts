/**
 * app/api/events/stream/route.ts — Server-Sent Events (SSE) Stream
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/events/stream
 *
 * Establishes a persistent SSE connection for the user's active organization.
 * Emits `event:update` when events are created or updated in the org.
 * Emits `ping` heartbeats every 15 seconds to prevent client timeout.
 *
 * Security:
 *   - Requires Clerk auth session.
 *   - All DB checks are scoped to user's `organizationId`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ctx = await getAuthContext();
  if (!ctx) {
    return new NextResponse("No active organization", { status: 400 });
  }

  const orgId = ctx.orgId;
  const encoder = new TextEncoder();

  let isAborted = false;
  req.signal.addEventListener("abort", () => {
    isAborted = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      let lastCheck = new Date();

      // Initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ orgId, time: lastCheck.toISOString() })}\n\n`)
      );

      let heartbeatCount = 0;

      while (!isAborted) {
        try {
          await new Promise((r) => setTimeout(r, 4000));
          if (isAborted) break;

          heartbeatCount++;

          // Check if any event in org was created/updated since last check
          const latestEvent = await prisma.event.findFirst({
            where: {
              organizationId: orgId,
              updatedAt: { gt: lastCheck },
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true, title: true, updatedAt: true },
          });

          if (latestEvent) {
            lastCheck = new Date();
            controller.enqueue(
              encoder.encode(
                `event: update\ndata: ${JSON.stringify({
                  eventId: latestEvent.id,
                  title: latestEvent.title,
                  updatedAt: latestEvent.updatedAt.toISOString(),
                })}\n\n`
              )
            );
          } else if (heartbeatCount % 3 === 0) {
            // Heartbeat every ~12s
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          }
        } catch {
          // Stream error or client disconnect
          break;
        }
      }

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
