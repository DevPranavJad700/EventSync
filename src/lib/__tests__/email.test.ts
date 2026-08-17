/**
 * src/lib/__tests__/email.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for Resend email helper & fallback logic
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi } from "vitest";
import { sendNewEventEmail, resend } from "../email";

describe("Resend Email Module & Safe Fallback", () => {
  it("gracefully returns false when RESEND_API_KEY is not configured", async () => {
    // When RESEND_API_KEY is unconfigured in test environment
    const result = await sendNewEventEmail({
      to: ["user@example.com"],
      eventTitle: "Team Retro",
      startTime: new Date("2026-09-10T10:00:00Z"),
      orgName: "Engineering",
      eventUrl: "http://localhost:3001/dashboard/events/evt_1",
    });

    if (!resend) {
      expect(result).toBe(false);
    }
  });

  it("handles empty recipient lists without error", async () => {
    const result = await sendNewEventEmail({
      to: [],
      eventTitle: "Empty Recipient Event",
      startTime: new Date(),
      orgName: "Engineering",
      eventUrl: "http://localhost:3001/dashboard/events/evt_2",
    });

    expect(result).toBe(false);
  });
});
