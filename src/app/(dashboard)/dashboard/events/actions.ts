/**
 * app/(dashboard)/dashboard/events/actions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions — Events CRUD
 *
 * All actions in this file are Next.js Server Actions (marked "use server").
 * They run exclusively on the server, have access to the database, and are
 * callable directly from Client Components without needing an API route.
 *
 * RBAC enforcement:
 *   Every mutating action calls `requireRole` before touching the database.
 *   Read actions use `getAuthContext` which returns null instead of throwing,
 *   making them safe for conditional rendering.
 *
 * Cursor Pagination (listEvents):
 *   The cursor is the `id` of the last Event on the current page, encoded as
 *   base64.  On the next page request, Prisma fetches items *after* that cursor
 *   using the `cursor` + `skip: 1` pattern.  This is stable (unlike offset
 *   pagination) even when items are inserted between pages.
 *
 * Extending for a new SaaS:
 *   Copy this file, replace "Event" with your entity, and update the Zod
 *   schemas in lib/validations/.  The requireRole calls stay the same.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, getAuthContext, RBACError } from "@/lib/rbac";
import { sendNewEventEmail } from "@/lib/email";
import {
  createEventSchema,
  updateEventSchema,
  paginationSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type PaginationInput,
} from "@/lib/validations/event";
import type { Event } from "@prisma/client";

// ─── Response Types ───────────────────────────────────────────────────────────

/** Standard action response — discriminated union for type-safe error handling. */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface EventsPage {
  events: Event[];
  /** Base64-encoded cursor for the next page, or null if no more pages. */
  nextCursor: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Encode a cursor ID to base64 to make it opaque to clients. */
function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

/** Decode a base64 cursor back to a raw ID. */
function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

// ─── List Events (with cursor pagination) ─────────────────────────────────────

/**
 * Lists events for the current user's active organization.
 * Returns a page of events and a cursor for fetching the next page.
 *
 * @param input  { cursor?, limit? } — pagination params.
 */
export async function listEvents(
  input: PaginationInput = {}
): Promise<ActionResult<EventsPage>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: "Not authenticated" };
    }

    const { cursor, limit } = paginationSchema.parse(input);
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;

    // Fetch limit + 1 to detect whether there's a next page.
    const events = await prisma.event.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      // Cursor-based pagination: skip the cursor item, start from the next one.
      ...(decodedCursor
        ? { cursor: { id: decodedCursor }, skip: 1 }
        : {}),
    });

    const hasNextPage = events.length > limit;
    const pageItems = hasNextPage ? events.slice(0, limit) : events;
    const nextCursor =
      hasNextPage && pageItems.length > 0
        ? encodeCursor(pageItems[pageItems.length - 1].id)
        : null;

    return { success: true, data: { events: pageItems, nextCursor } };
  } catch (err) {
    console.error("[listEvents]", err);
    return { success: false, error: "Failed to load events" };
  }
}

// ─── Get Single Event ─────────────────────────────────────────────────────────

/**
 * Fetches a single event by ID, scoped to the current org for safety.
 */
export async function getEvent(
  id: string
): Promise<ActionResult<Event>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: "Not authenticated" };
    }

    const event = await prisma.event.findFirst({
      where: { id, organizationId: ctx.orgId },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    return { success: true, data: event };
  } catch (err) {
    console.error("[getEvent]", err);
    return { success: false, error: "Failed to load event" };
  }
}

// ─── Create Event ─────────────────────────────────────────────────────────────

/**
 * Creates a new event in the current organization.
 * Requires ADMIN or MANAGER role.
 */
export async function createEvent(
  input: CreateEventInput
): Promise<ActionResult<Event>> {
  try {
    // RBAC: only ADMIN/MANAGER can create events.
    const ctx = await requireRole(["ADMIN", "MANAGER"]);

    // Validate input server-side (Zod also runs on the client, but we always
    // validate server-side too — never trust client data alone).
    const data = createEventSchema.parse(input);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        startTime: data.startTime,
        endTime: data.endTime,
        organizationId: ctx.orgId,
        createdById: ctx.userId,
      },
    });

    // Revalidate the events list page so it reflects the new event immediately.
    revalidatePath("/dashboard/events");

    // Asynchronously dispatch email notifications to org members (non-blocking)
    (async () => {
      try {
        const org = await prisma.organization.findUnique({
          where: { id: ctx.orgId },
          select: { name: true },
        });
        const members = await prisma.membership.findMany({
          where: { organizationId: ctx.orgId, user: { deletedAt: null } },
          include: { user: { select: { email: true } } },
        });
        const recipientEmails = members
          .map((m) => m.user.email)
          .filter(Boolean);

        if (recipientEmails.length > 0 && org) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
          await sendNewEventEmail({
            to: recipientEmails,
            eventTitle: event.title,
            eventDescription: event.description,
            startTime: event.startTime,
            location: event.location,
            orgName: org.name,
            eventUrl: `${appUrl}/dashboard/events/${event.id}`,
          });
        }
      } catch (emailErr) {
        console.error("[createEvent] Email notification error:", emailErr);
      }
    })();

    return { success: true, data: event };
  } catch (err) {
    if (err instanceof RBACError) {
      return { success: false, error: err.message };
    }
    console.error("[createEvent]", err);
    return { success: false, error: "Failed to create event" };
  }
}

// ─── Update Event ─────────────────────────────────────────────────────────────

/**
 * Updates an existing event by ID.
 * Requires ADMIN or MANAGER role.
 * Only updates the fields that are provided (partial update).
 */
export async function updateEvent(
  id: string,
  input: UpdateEventInput
): Promise<ActionResult<Event>> {
  try {
    const ctx = await requireRole(["ADMIN", "MANAGER"]);
    const data = updateEventSchema.parse(input);

    // Verify the event belongs to the current org before updating.
    const existing = await prisma.event.findFirst({
      where: { id, organizationId: ctx.orgId },
    });
    if (!existing) {
      return { success: false, error: "Event not found" };
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.location !== undefined && {
          location: data.location || null,
        }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
      },
    });

    revalidatePath("/dashboard/events");

    return { success: true, data: event };
  } catch (err) {
    if (err instanceof RBACError) {
      return { success: false, error: err.message };
    }
    console.error("[updateEvent]", err);
    return { success: false, error: "Failed to update event" };
  }
}

// ─── Delete Event ─────────────────────────────────────────────────────────────

/**
 * Deletes an event by ID.
 * Requires ADMIN role only (more destructive than edit).
 */
export async function deleteEvent(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireRole(["ADMIN"]);

    // Scope deletion to the current org — prevents cross-org deletion attacks.
    const existing = await prisma.event.findFirst({
      where: { id, organizationId: ctx.orgId },
    });
    if (!existing) {
      return { success: false, error: "Event not found" };
    }

    await prisma.event.delete({ where: { id } });

    revalidatePath("/dashboard/events");

    return { success: true, data: { id } };
  } catch (err) {
    if (err instanceof RBACError) {
      return { success: false, error: err.message };
    }
    console.error("[deleteEvent]", err);
    return { success: false, error: "Failed to delete event" };
  }
}
