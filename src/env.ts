/**
 * src/env.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Runtime Environment Variable Validation
 *
 * Validates process.env against a strict Zod schema at application boot.
 * Fails fast with clear diagnostic messages if any required variable is
 * missing or invalid, preventing silent runtime failures deep in request paths.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

const envSchema = z.object({
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required"),

  // Database Connection
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  // Upstash Redis (Optional: for serverless distributed rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function validateEnv() {
  // Pass test defaults if running inside Vitest/Jest test environment
  if (process.env.NODE_ENV === "test") {
    return {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_mock",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "sk_test_mock",
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "whsec_test_mock",
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock",
      DIRECT_URL: process.env.DIRECT_URL || "postgresql://mock:mock@localhost:5432/mock",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      NODE_ENV: "test" as const,
    };
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check your .env.local file.");
  }

  return result.data;
}

export const env = validateEnv();
