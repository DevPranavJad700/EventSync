/**
 * src/lib/__tests__/rate-limit.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit Tests for In-Memory Sliding Window Rate Limiter
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

describe("SlidingWindowRateLimiter", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    // 3 requests per 10 seconds (10,000ms)
    limiter = new SlidingWindowRateLimiter({
      windowMs: 10_000,
      maxRequests: 3,
    });
  });

  it("allows requests up to maxRequests limit", () => {
    const ip = "192.168.1.1";

    const res1 = limiter.check(ip);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check(ip);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check(ip);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests exceeding maxRequests within window", () => {
    const ip = "192.168.1.1";

    limiter.check(ip);
    limiter.check(ip);
    limiter.check(ip);

    const blockedRes = limiter.check(ip);
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetMs).toBeGreaterThan(0);
  });

  it("resets allowance after sliding window passes", () => {
    const ip = "192.168.1.1";

    limiter.check(ip);
    limiter.check(ip);
    limiter.check(ip);

    expect(limiter.check(ip).success).toBe(false);

    // Advance fake timers by 11 seconds (past windowMs)
    vi.advanceTimersByTime(11_000);

    const newRes = limiter.check(ip);
    expect(newRes.success).toBe(true);
    expect(newRes.remaining).toBe(2);
  });
});
