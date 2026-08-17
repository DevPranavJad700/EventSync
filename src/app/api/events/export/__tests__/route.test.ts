/**
 * src/app/api/events/export/__tests__/route.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for GET /api/events/export (iCal generator)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/events/export — iCal Calendar Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const req = new NextRequest("http://localhost:3001/api/events/export");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when user has no active organization", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
    vi.mocked(getAuthContext).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/events/export");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("returns valid RFC 5545 iCalendar data when events exist", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "u_1",
      clerkUserId: "user_clerk_1",
      orgId: "org_1",
      clerkOrgId: "org_clerk_1",
      role: "ADMIN",
    });

    const mockEvents = [
      {
        id: "evt_1",
        title: "All Hands Meeting",
        description: "Quarterly review",
        location: "Main Office",
        startTime: new Date("2026-09-01T10:00:00Z"),
        endTime: new Date("2026-09-01T11:00:00Z"),
        organizationId: "org_1",
        createdById: "u_1",
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: new Date("2026-08-01T00:00:00Z"),
      },
    ];

    vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents as any);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      name: "Acme Corp",
    } as any);

    const req = new NextRequest("http://localhost:3001/api/events/export");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");

    const text = await res.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("VERSION:2.0");
    expect(text).toContain("SUMMARY:All Hands Meeting");
    expect(text).toContain("LOCATION:Main Office");
    expect(text).toContain("END:VCALENDAR");
  });
});
