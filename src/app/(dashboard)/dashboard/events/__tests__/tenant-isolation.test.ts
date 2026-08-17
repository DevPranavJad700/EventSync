/**
 * src/app/(dashboard)/dashboard/events/__tests__/tenant-isolation.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-Tenant Isolation & IDOR Protection Tests
 *
 * Verifies that tenant boundary controls strictly prevent cross-organization
 * access or mutation — even when a user holds the highest role (ADMIN) in
 * their own organization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getEvent, updateEvent, deleteEvent, listEvents } from "../actions";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

describe("Multi-Tenant Isolation — Cross-Org IDOR Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Authenticate user as ADMIN in Organization A ("org_A_local_id")
    (auth as any).mockResolvedValue({
      userId: "user_A_clerk_id",
      orgId: "org_A_clerk_id",
    });

    (prisma.membership.findFirst as any).mockResolvedValue({
      role: "ADMIN",
      user: { id: "user_A_local_id" },
      organization: { id: "org_A_local_id" },
    });
  });

  it("blocks user in Org A from viewing an Event belonging to Org B (getEvent)", async () => {
    // Mock event lookup returning null because organizationId filter does not match org_A_local_id
    (prisma.event.findFirst as any).mockResolvedValue(null);

    const result = await getEvent("evt_belonging_to_org_B");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Event not found");
    }

    // Verify DB query scoped strictly to Org A's ID
    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: {
        id: "evt_belonging_to_org_B",
        organizationId: "org_A_local_id",
      },
    });
  });

  it("blocks ADMIN in Org A from updating an Event belonging to Org B (updateEvent)", async () => {
    (prisma.event.findFirst as any).mockResolvedValue(null);

    const result = await updateEvent("evt_belonging_to_org_B", {
      title: "Malicious Cross-Tenant Title Update",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Event not found");
    }

    // Verify update mutation was NEVER called
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it("blocks ADMIN in Org A from deleting an Event belonging to Org B (deleteEvent)", async () => {
    (prisma.event.findFirst as any).mockResolvedValue(null);

    const result = await deleteEvent("evt_belonging_to_org_B");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Event not found");
    }

    // Verify delete mutation was NEVER called
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it("scopes event listing strictly to Org A (listEvents)", async () => {
    (prisma.event.findMany as any).mockResolvedValue([]);

    await listEvents({ limit: 10 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_A_local_id" },
      })
    );
  });
});
