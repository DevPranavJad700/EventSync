/**
 * src/app/(dashboard)/dashboard/events/__tests__/actions.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit & Integration Tests for Events Actions & Cursor Pagination Logic
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

import { listEvents } from "../actions";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

describe("Events Actions — Cursor Pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated error if auth() yields no userId", async () => {
    (auth as any).mockResolvedValue({ userId: null, orgId: null });

    const result = await listEvents({ limit: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not authenticated");
    }
  });

  it("calculates nextCursor correctly when total events exceed limit", async () => {
    (auth as any).mockResolvedValue({
      userId: "user_clerk123",
      orgId: "org_clerk123",
    });

    (prisma.membership.findFirst as any).mockResolvedValue({
      role: "MEMBER",
      user: { id: "u_local1" },
      organization: { id: "org_local1" },
    });

    // Mock fetching limit + 1 items (e.g. limit=2, returned 3 items)
    const mockEvents = [
      { id: "evt_1", title: "Event 1", createdAt: new Date() },
      { id: "evt_2", title: "Event 2", createdAt: new Date() },
      { id: "evt_3", title: "Event 3", createdAt: new Date() },
    ];

    (prisma.event.findMany as any).mockResolvedValue(mockEvents);

    const result = await listEvents({ limit: 2 });
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.events).toHaveLength(2); // sliced to limit
      expect(result.data.events[0].id).toBe("evt_1");
      expect(result.data.events[1].id).toBe("evt_2");

      // nextCursor should be base64 of last page item (evt_2)
      const expectedCursor = Buffer.from("evt_2").toString("base64");
      expect(result.data.nextCursor).toBe(expectedCursor);
    }
  });

  it("returns nextCursor: null when remaining events fit within limit", async () => {
    (auth as any).mockResolvedValue({
      userId: "user_clerk123",
      orgId: "org_clerk123",
    });

    (prisma.membership.findFirst as any).mockResolvedValue({
      role: "MEMBER",
      user: { id: "u_local1" },
      organization: { id: "org_local1" },
    });

    const mockEvents = [
      { id: "evt_1", title: "Event 1", createdAt: new Date() },
    ];

    (prisma.event.findMany as any).mockResolvedValue(mockEvents);

    const result = await listEvents({ limit: 10 });
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.events).toHaveLength(1);
      expect(result.data.nextCursor).toBeNull();
    }
  });
});
