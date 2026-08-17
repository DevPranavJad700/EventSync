/**
 * app/api/events/export/route.ts — iCal Calendar Export
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/events/export?id=<eventId>   — exports a single event
 * GET /api/events/export                — exports ALL org events
 *
 * Returns a standard RFC 5545 iCalendar (.ics) file that opens in
 * Google Calendar, Apple Calendar, Outlook, and any calendar app.
 *
 * Security:
 *   - Requires Clerk session (401 if unauthenticated)
 *   - All queries are scoped to the user's active orgId (IDOR-safe)
 *   - Rate-limited via the shared API rate limiter
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/rbac";
import { apiRateLimiter, getClientIp } from "@/lib/rate-limit";
import type { Event } from "@prisma/client";

// ─── iCal Helpers ─────────────────────────────────────────────────────────────

/** Format a JS Date to iCal DATETIME string (UTC): 20260817T120000Z */
function toICalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escape special characters in iCal text fields (RFC 5545 §3.3.11). */
function escapeIcal(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Fold long iCal lines at 75 octets (RFC 5545 §3.1).
 * Continuation lines start with a single space.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

/** Serialize a single Prisma Event to a VEVENT block. */
function eventToVEvent(event: Event, orgName: string): string {
  const lines = [
    "BEGIN:VEVENT",
    foldLine(`UID:eventsync-${event.id}@eventsync.app`),
    foldLine(`DTSTAMP:${toICalDate(new Date())}`),
    foldLine(`DTSTART:${toICalDate(new Date(event.startTime))}`),
    foldLine(`DTEND:${toICalDate(new Date(event.endTime))}`),
    foldLine(`SUMMARY:${escapeIcal(event.title)}`),
  ];

  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeIcal(event.description)}`));
  }
  if (event.location) {
    lines.push(foldLine(`LOCATION:${escapeIcal(event.location)}`));
  }

  lines.push(
    foldLine(`ORGANIZER;CN=${escapeIcal(orgName)}:mailto:noreply@eventsync.app`),
    foldLine(`CREATED:${toICalDate(new Date(event.createdAt))}`),
    foldLine(`LAST-MODIFIED:${toICalDate(new Date(event.updatedAt))}`),
    "STATUS:CONFIRMED",
    "END:VEVENT"
  );

  return lines.join("\r\n");
}

/** Wrap VEVENT blocks in a VCALENDAR envelope. */
function buildCalendar(vevents: string[], calName: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventSync//EventSync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeIcal(calName)}`),
    "X-WR-TIMEZONE:UTC",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  const rateLimit = await apiRateLimiter.limit(ip);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // 2. Authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Get org context (IDOR protection — all queries scoped to orgId)
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  // 4. Resolve optional single-event id from query string
  const { searchParams } = new URL(req.url);
  const singleId = searchParams.get("id");

  // 5. Fetch events (scoped to org)
  const events = singleId
    ? await prisma.event.findMany({
        where: { id: singleId, organizationId: ctx.orgId },
      })
    : await prisma.event.findMany({
        where: { organizationId: ctx.orgId },
        orderBy: { startTime: "asc" },
      });

  if (events.length === 0) {
    return NextResponse.json({ error: "No events found" }, { status: 404 });
  }

  // 6. Fetch org name for the calendar title
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true },
  });
  const orgName = org?.name ?? "EventSync";

  // 7. Build the .ics payload
  const vevents = events.map((e) => eventToVEvent(e, orgName));
  const icsContent = buildCalendar(
    vevents,
    singleId ? events[0].title : `${orgName} Events`
  );

  // 8. Return as downloadable .ics file
  const filename = singleId
    ? `${events[0].title.replace(/[^a-z0-9]/gi, "_")}.ics`
    : `${orgName.replace(/[^a-z0-9]/gi, "_")}_events.ics`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    },
  });
}
