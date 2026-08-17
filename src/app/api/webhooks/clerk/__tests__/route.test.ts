/**
 * src/app/api/webhooks/clerk/__tests__/route.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Webhook Route Integration Tests — Signature Verification & Idempotency
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn(),
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

describe("Webhook API Route — Security & Idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_testsecret12345";
  });

  it("rejects request with HTTP 400 when Svix headers are missing", async () => {
    (headers as any).mockResolvedValue(new Map());

    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({ type: "user.created", data: {} }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toContain("Missing Svix headers");
  });

  it("rejects request with HTTP 400 when timestamp is outside 5-minute tolerance window", async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const headerMap = new Map([
      ["svix-id", "msg_stale123"],
      ["svix-timestamp", String(staleTimestamp)],
      ["svix-signature", "v1,signature"],
    ]);

    (headers as any).mockResolvedValue({
      get: (key: string) => headerMap.get(key) || null,
    });

    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({ type: "user.created", data: {} }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toContain("Timestamp outside tolerance window");
  });

  it("returns HTTP 200 immediately without reprocessing if svixId is already in WebhookEvent log", async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const headerMap = new Map([
      ["svix-id", "msg_duplicate123"],
      ["svix-timestamp", String(currentTimestamp)],
      ["svix-signature", "v1,valid_sig"],
    ]);

    (headers as any).mockResolvedValue({
      get: (key: string) => headerMap.get(key) || null,
    });

    // Mock Svix verification success
    (Webhook as any).mockImplementation(function MockWebhook() {
      return {
        verify: () => ({ type: "user.created", data: { id: "user_123" } }),
      };
    });

    // Mock existing log hit (duplicate delivery)
    (prisma.webhookEvent.findUnique as any).mockResolvedValue({
      id: "evt_1",
      svixId: "msg_duplicate123",
      status: "processed",
    });

    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({ type: "user.created", data: { id: "user_123" } }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Already processed");

    // Assert DB upsert was NOT called again
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });
});
