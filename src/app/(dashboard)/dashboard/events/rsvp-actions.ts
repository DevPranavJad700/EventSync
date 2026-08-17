/**
 * app/(dashboard)/dashboard/events/rsvp-actions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions — Event RSVP / Attendance
 *
 * Scoped by `organizationId` and `userId` for tenant isolation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthContext, requireRole, RBACError } from "@/lib/rbac";
import { RsvpStatus } from "@prisma/client";
import { z } from "zod";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const rsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.nativeEnum(RsvpStatus),
});

export interface AttendeeSummary {
  status: RsvpStatus;
  user: {
    id: string;
    name: string | null;
    email: string;
    imageUrl: string | null;
  };
}

export interface RsvpCounts {
  going: number;
  maybe: number;
  notGoing: number;
  userStatus: RsvpStatus | null;
}

/**
 * Upsert the current user's RSVP status for an event in their active organization.
 */
export async function upsertRsvp(
  eventId: string,
  status: RsvpStatus
): Promise<ActionResult<{ status: RsvpStatus }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: "Not authenticated" };
    }

    const valid = rsvpSchema.parse({ eventId, status });

    // Verify event exists & belongs to org
    const event = await prisma.event.findFirst({
      where: { id: valid.eventId, organizationId: ctx.orgId },
    });

    if (!event) {
      return { success: false, error: "Event not found in organization" };
    }

    await prisma.attendance.upsert({
      where: {
        eventId_userId: {
          eventId: valid.eventId,
          userId: ctx.userId,
        },
      },
      update: {
        status: valid.status,
        organizationId: ctx.orgId,
      },
      create: {
        eventId: valid.eventId,
        userId: ctx.userId,
        organizationId: ctx.orgId,
        status: valid.status,
      },
    });

    revalidatePath(`/dashboard/events/${valid.eventId}`);
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/analytics");

    return { success: true, data: { status: valid.status } };
  } catch (err) {
    if (err instanceof RBACError) {
      return { success: false, error: err.message };
    }
    console.error("[upsertRsvp]", err);
    return { success: false, error: "Failed to update RSVP" };
  }
}

/**
 * Get RSVP counts and the current user's RSVP status for an event.
 */
export async function getRsvpCounts(
  eventId: string
): Promise<ActionResult<RsvpCounts>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: "Not authenticated" };
    }

    const [attendances, myAttendance] = await Promise.all([
      prisma.attendance.findMany({
        where: { eventId, organizationId: ctx.orgId },
        select: { status: true },
      }),
      prisma.attendance.findUnique({
        where: { eventId_userId: { eventId, userId: ctx.userId } },
        select: { status: true },
      }),
    ]);

    const counts: RsvpCounts = {
      going: attendances.filter((a) => a.status === RsvpStatus.GOING).length,
      maybe: attendances.filter((a) => a.status === RsvpStatus.MAYBE).length,
      notGoing: attendances.filter((a) => a.status === RsvpStatus.NOT_GOING).length,
      userStatus: myAttendance?.status ?? null,
    };

    return { success: true, data: counts };
  } catch (err) {
    console.error("[getRsvpCounts]", err);
    return { success: false, error: "Failed to load RSVP data" };
  }
}

/**
 * Get full list of attendees for an event.
 */
export async function getEventAttendees(
  eventId: string
): Promise<ActionResult<AttendeeSummary[]>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: "Not authenticated" };
    }

    const attendances = await prisma.attendance.findMany({
      where: { eventId, organizationId: ctx.orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: AttendeeSummary[] = attendances.map((a) => ({
      status: a.status,
      user: a.user,
    }));

    return { success: true, data };
  } catch (err) {
    console.error("[getEventAttendees]", err);
    return { success: false, error: "Failed to load attendees" };
  }
}
