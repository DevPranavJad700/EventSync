/**
 * lib/prisma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton Prisma Client — Prisma 7 with Driver Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeConnectionString(url: string): string {
  // Replace legacy sslmodes with sslmode=verify-full to suppress pg-connection-string v8 warning
  return url.replace(/sslmode=(require|prefer|verify-ca)(?=&|$)/g, "sslmode=verify-full");
}

function createPrismaClient() {
  const connectionString = normalizeConnectionString(env.DATABASE_URL);

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}


export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
