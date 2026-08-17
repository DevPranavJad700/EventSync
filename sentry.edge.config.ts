/**
 * sentry.edge.config.ts — Sentry Edge Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures Middleware and Edge runtime errors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  });
}
