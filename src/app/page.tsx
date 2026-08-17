/**
 * app/page.tsx — Landing / Marketing Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Public-facing landing page for EventSync.
 * Replace this with your own marketing content when building a real SaaS.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Shield, Webhook, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EventSync — Role-Based SaaS Boilerplate",
  description:
    "A production-ready Next.js starter with Clerk auth, multi-tenant organizations, RBAC, and webhook-driven database sync.",
  openGraph: {
    title: "EventSync — Role-Based SaaS Boilerplate",
    description:
      "Ship your SaaS faster. Next.js + Clerk + NeonDB + Prisma with RBAC, webhook sync, rate limiting, and full test coverage.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  },
  twitter: {
    card: "summary_large_image",
    title: "EventSync — Role-Based SaaS Boilerplate",
    description:
      "A production-ready multi-tenant SaaS starter. Next.js, Clerk, NeonDB, Prisma.",
  },
};

export default async function HomePage() {
  // If already signed in, take them straight to the dashboard.
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const features = [
    {
      icon: Shield,
      title: "Clerk Auth + OAuth",
      desc: "Email/password and Google OAuth out of the box. Protected routes via middleware.",
    },
    {
      icon: Users,
      title: "Multi-Tenant Orgs",
      desc: "Clerk Organizations + RBAC: ADMIN, MANAGER, MEMBER roles per org.",
    },
    {
      icon: Webhook,
      title: "Webhook Sync",
      desc: "Svix-verified webhook endpoint keeps your Postgres DB in sync with Clerk events.",
    },
    {
      icon: Calendar,
      title: "Events CRUD Demo",
      desc: "Full create/read/update/delete with cursor pagination and search as a reference module.",
    },
  ];

  const techStack = [
    "Next.js 16",
    "Clerk",
    "NeonDB",
    "Prisma 7",
    "TypeScript",
    "Tailwind CSS",
    "Vitest",
    "Playwright",
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">ES</span>
            </div>
            <span className="font-semibold">EventSync</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-4">
            Open-source SaaS Boilerplate
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ship your SaaS faster with{" "}
            <span className="text-primary">EventSync</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-lg">
            A production-ready Next.js starter with Clerk auth, multi-tenant
            organizations, role-based access control, and webhook-driven database
            sync — so you can focus on your product, not the plumbing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Start Building →</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>

          {/* Tech stack badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {techStack.map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold mb-10">
              Everything wired up from day one
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-2xl px-4 text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to start building?</h2>
            <p className="text-muted-foreground">
              Sign up for free and have your first protected dashboard running in minutes.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="mt-2">
                Create your account →
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <span className="text-[10px] font-bold text-primary-foreground">ES</span>
              </div>
              <span className="text-sm font-semibold">EventSync</span>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/sign-in" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="hover:text-foreground transition-colors">
                Sign Up
              </Link>
              <a
                href="https://github.com/your-username/eventsync"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://clerk.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Clerk Docs
              </a>
              <a
                href="https://neon.tech/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Neon Docs
              </a>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} EventSync. MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
