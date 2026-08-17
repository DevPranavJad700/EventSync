/**
 * src/lib/__tests__/rbac.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit Tests for RBAC Authorization Utilities & Soft Delete Rules
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasRole, getAuthContext, requireRole, RBACError } from "@/lib/rbac";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(),
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

describe("RBAC Logic — hasRole predicate", () => {
  it("allows ADMIN role when ADMIN or MANAGER is required", () => {
    expect(hasRole("ADMIN", ["ADMIN", "MANAGER"])).toBe(true);
  });

  it("allows MANAGER role when ADMIN or MANAGER is required", () => {
    expect(hasRole("MANAGER", ["ADMIN", "MANAGER"])).toBe(true);
  });

  it("denies MEMBER role when ADMIN or MANAGER is required", () => {
    expect(hasRole("MEMBER", ["ADMIN", "MANAGER"])).toBe(false);
  });

  it("allows MEMBER role when allowedRoles includes MEMBER", () => {
    expect(hasRole("MEMBER", ["ADMIN", "MANAGER", "MEMBER"])).toBe(true);
  });

  it("handles empty allowedRoles array by denying access", () => {
    expect(hasRole("ADMIN", [])).toBe(false);
  });
});

describe("RBAC Queries — Soft Delete Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAuthContext returns null when user or organization is soft-deleted", async () => {
    (auth as any).mockResolvedValue({
      userId: "user_clerk_deleted",
      orgId: "org_clerk_active",
    });

    // DB query returns null because deletedAt: null filter fails
    (prisma.membership.findFirst as any).mockResolvedValue(null);

    const ctx = await getAuthContext();
    expect(ctx).toBeNull();

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        user: { clerkId: "user_clerk_deleted", deletedAt: null },
        organization: { clerkOrgId: "org_clerk_active", deletedAt: null },
      },
      include: expect.any(Object),
    });
  });

  it("requireRole throws RBACError when user or organization is soft-deleted", async () => {
    (auth as any).mockResolvedValue({
      userId: "user_clerk_active",
      orgId: "org_clerk_deleted",
    });

    (prisma.membership.findFirst as any).mockResolvedValue(null);

    await expect(requireRole(["ADMIN"])).rejects.toThrow(RBACError);
  });
});
