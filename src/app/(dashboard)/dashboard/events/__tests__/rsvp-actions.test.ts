/**
 * app/(dashboard)/dashboard/events/__tests__/rsvp-actions.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for RSVP server actions & tenant isolation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { upsertRsvp, getRsvpCounts } from "../rsvp-actions";
import { getAuthContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { RsvpStatus } from "@prisma/client";

vi.mock("@/lib/rbac", () => ({
  getAuthContext: vi.fn(),
  requireRole: vi.fn(),
  RBACError: class RBACError extends Error {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
    },
    attendance: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("RSVP Actions & Tenant Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails to upsert RSVP when user is unauthenticated", async () => {
    vi.mocked(getAuthContext).mockResolvedValue(null);

    const res = await upsertRsvp("evt_1", RsvpStatus.GOING);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("Not authenticated");
    }
  });

  it("fails to RSVP to an event belonging to another organization (IDOR protection)", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "u_1",
      clerkUserId: "user_clerk_1",
      orgId: "org_A",
      clerkOrgId: "org_clerk_A",
      role: "MEMBER",
    });
    // Event not found in org_A
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    const res = await upsertRsvp("evt_belonging_to_org_B", RsvpStatus.GOING);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("Event not found in organization");
    }
  });

  it("successfully upserts RSVP when event belongs to user's org", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "u_1",
      clerkUserId: "user_clerk_1",
      orgId: "org_A",
      clerkOrgId: "org_clerk_A",
      role: "MEMBER",
    });
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: "evt_1",
      organizationId: "org_A",
    } as any);

    vi.mocked(prisma.attendance.upsert).mockResolvedValue({
      id: "att_1",
      eventId: "evt_1",
      userId: "u_1",
      organizationId: "org_A",
      status: RsvpStatus.GOING,
    } as any);

    const res = await upsertRsvp("evt_1", RsvpStatus.GOING);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.status).toBe(RsvpStatus.GOING);
    }
  });

  it("correctly aggregates RSVP counts per org event", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "u_1",
      clerkUserId: "user_clerk_1",
      orgId: "org_A",
      clerkOrgId: "org_clerk_A",
      role: "MEMBER",
    });

    vi.mocked(prisma.attendance.findMany).mockResolvedValue([
      { status: RsvpStatus.GOING },
      { status: RsvpStatus.GOING },
      { status: RsvpStatus.MAYBE },
    ] as any);

    vi.mocked(prisma.attendance.findUnique).mockResolvedValue({
      status: RsvpStatus.GOING,
    } as any);

    const res = await getRsvpCounts("evt_1");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.going).toBe(2);
      expect(res.data.maybe).toBe(1);
      expect(res.data.notGoing).toBe(0);
      expect(res.data.userStatus).toBe(RsvpStatus.GOING);
    }
  });
});
