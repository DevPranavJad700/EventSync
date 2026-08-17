/**
 * prisma/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Database Seed Script
 *
 * Creates a realistic demo dataset:
 *   • 1 Organization — "Acme Corp"
 *   • 3 Users with different roles (ADMIN, MANAGER, MEMBER)
 *   • 5 Events (a mix of past and upcoming)
 *
 * Run with:
 *   npx tsx prisma/seed.ts
 *
 * IMPORTANT: This seed uses fake Clerk IDs (prefixed with "clerk_seed_").
 * In a real app, these IDs come from Clerk via webhooks.  The seed is purely
 * for local development and demo purposes.
 *
 * Idempotent: Re-running the seed will upsert existing records rather than
 * creating duplicates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
const adapter = new PrismaPg({ connectionString: connectionString! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ── Organization ────────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { clerkOrgId: "clerk_seed_org_acme" },
    create: {
      clerkOrgId: "clerk_seed_org_acme",
      name: "Acme Corp",
    },
    update: { name: "Acme Corp" },
  });
  console.log(`  ✓ Organization: ${org.name} (${org.id})`);

  // ── Users ────────────────────────────────────────────────────────────────────
  const alice = await prisma.user.upsert({
    where: { clerkId: "clerk_seed_user_alice" },
    create: {
      clerkId: "clerk_seed_user_alice",
      email: "alice@acme.com",
      name: "Alice Admin",
    },
    update: { name: "Alice Admin" },
  });

  const bob = await prisma.user.upsert({
    where: { clerkId: "clerk_seed_user_bob" },
    create: {
      clerkId: "clerk_seed_user_bob",
      email: "bob@acme.com",
      name: "Bob Manager",
    },
    update: { name: "Bob Manager" },
  });

  const carol = await prisma.user.upsert({
    where: { clerkId: "clerk_seed_user_carol" },
    create: {
      clerkId: "clerk_seed_user_carol",
      email: "carol@acme.com",
      name: "Carol Member",
    },
    update: { name: "Carol Member" },
  });

  console.log(`  ✓ Users: ${alice.name}, ${bob.name}, ${carol.name}`);

  // ── Memberships ───────────────────────────────────────────────────────────────
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: alice.id, organizationId: org.id } },
    create: { userId: alice.id, organizationId: org.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: bob.id, organizationId: org.id } },
    create: { userId: bob.id, organizationId: org.id, role: "MANAGER" },
    update: { role: "MANAGER" },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: carol.id, organizationId: org.id } },
    create: { userId: carol.id, organizationId: org.id, role: "MEMBER" },
    update: { role: "MEMBER" },
  });

  console.log("  ✓ Memberships: ADMIN (Alice), MANAGER (Bob), MEMBER (Carol)");

  // ── Events ────────────────────────────────────────────────────────────────────
  const now = new Date();

  const eventsData = [
    {
      title: "Q3 All-Hands Meeting",
      description:
        "Company-wide quarterly update covering product roadmap, financials, and team spotlights.",
      location: "Main Conference Room",
      startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      createdById: alice.id,
    },
    {
      title: "Product Design Sprint",
      description:
        "Two-day design sprint to prototype the new onboarding flow.",
      location: "Innovation Lab",
      startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
      createdById: bob.id,
    },
    {
      title: "Engineering Sync",
      description: "Weekly engineering stand-up and sprint review.",
      location: "Zoom — link in calendar invite",
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      createdById: bob.id,
    },
    {
      title: "Customer Advisory Board",
      description:
        "Quarterly session with our top customers for product feedback.",
      location: "Boardroom B",
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (past)
      endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      createdById: alice.id,
    },
    {
      title: "Team Social — Summer Outing",
      description: "Annual team social event. Location TBD.",
      location: "TBD",
      startTime: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      createdById: alice.id,
    },
  ];

  for (const eventData of eventsData) {
    await prisma.event.create({
      data: {
        ...eventData,
        organizationId: org.id,
      },
    });
    console.log(`  ✓ Event: "${eventData.title}"`);
  }

  console.log("\n✅ Seed complete!");
  console.log(`\nDemo credentials (for reference):\n`);
  console.log("  Alice (ADMIN)   — alice@acme.com");
  console.log("  Bob (MANAGER)   — bob@acme.com");
  console.log("  Carol (MEMBER)  — carol@acme.com");
  console.log("\nNote: These are DB-only seed records. Sign up via Clerk to");
  console.log("create a real account — webhook sync will populate the DB.");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
