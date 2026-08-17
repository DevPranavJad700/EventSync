/**
 * src/lib/rate-limit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hybrid Rate Limiter — Serverless Upstash Redis + In-Memory Fallback
 *
 * Architecture:
 *   - Production (Vercel Serverless): Uses @upstash/ratelimit over Upstash Redis
 *     to maintain global distributed state across all serverless Lambdas.
 *   - Development / Local / Standalone: Automatically falls back to an in-memory
 *     sliding window algorithm if UPSTASH_REDIS_REST_URL is unconfigured.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

// ─── Upstash Redis Setup (Production Serverless) ──────────────────────────────

const hasUpstashConfig =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const upstashWebhookLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "eventsync:ratelimit:webhook",
    })
  : null;

const upstashApiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "eventsync:ratelimit:api",
    })
  : null;

if (hasUpstashConfig) {
  logger.info("Serverless rate limiting initialized with Upstash Redis");
} else {
  logger.info("Using in-memory sliding window rate limiter fallback");
}

// ─── In-Memory Fallback Limiter (Local Dev & Testing) ─────────────────────────

export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private hits: Map<string, number[]> = new Map();

  constructor(config: { windowMs: number; maxRequests: number }) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = (this.hits.get(identifier) || []).filter(
      (time) => time > windowStart
    );

    if (timestamps.length >= this.maxRequests) {
      const oldestTimestamp = timestamps[0];
      const resetMs = oldestTimestamp + this.windowMs - now;

      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    timestamps.push(now);
    this.hits.set(identifier, timestamps);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowMs,
    };
  }
}

const memoryWebhookLimiter = new SlidingWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
});

const memoryApiLimiter = new SlidingWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

// ─── Exported Hybrid Interface ────────────────────────────────────────────────

export const webhookRateLimiter = {
  async limit(identifier: string): Promise<RateLimitResult> {
    if (upstashWebhookLimiter) {
      const res = await upstashWebhookLimiter.limit(identifier);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        resetMs: Math.max(0, res.reset - Date.now()),
      };
    }
    return memoryWebhookLimiter.check(identifier);
  },
  check(identifier: string): RateLimitResult {
    return memoryWebhookLimiter.check(identifier);
  },
};

export const apiRateLimiter = {
  async limit(identifier: string): Promise<RateLimitResult> {
    if (upstashApiLimiter) {
      const res = await upstashApiLimiter.limit(identifier);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        resetMs: Math.max(0, res.reset - Date.now()),
      };
    }
    return memoryApiLimiter.check(identifier);
  },
  check(identifier: string): RateLimitResult {
    return memoryApiLimiter.check(identifier);
  },
};

/** Extracts client IP address from standard request headers. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
