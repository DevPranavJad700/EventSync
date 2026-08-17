/**
 * prisma.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Prisma 7 Configuration File
 *
 * Prisma 7 moved database connection configuration from schema.prisma into
 * this file.  The CLI (db push, migrate dev, studio, seed) uses this config.
 *
 * Connection strategy for NeonDB:
 *   datasource.url — The URL used by Prisma CLI for migrations and schema push.
 *                    Should be the "direct" (non-pooled) NeonDB URL.
 *                    Falls back to DATABASE_URL if DIRECT_URL is not set.
 *
 * At runtime, lib/prisma.ts uses the PrismaPg adapter with DATABASE_URL
 * (the pooled URL) — that is handled separately in the PrismaClient constructor.
 *
 * See: https://pris.ly/d/config-datasource
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Use the direct (non-pooled) URL for CLI operations (migrations, db push, seed).
    // Falls back to DATABASE_URL if DIRECT_URL is not set.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
