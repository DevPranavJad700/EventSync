/**
 * app/(dashboard)/dashboard/page.tsx — Dashboard Home
 * ─────────────────────────────────────────────────────────────────────────────
 * The dashboard landing page. Shows live KPI stats (event count, upcoming
 * events, member count) queried directly from the DB, plus a quick-access
 * card to the Events section.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Calendar, ArrowRight, Users, Clock, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { userId } = await auth();

  // Double-check auth (middleware handles this too, but defense-in-depth).
  if (!userId) {
    redirect("/sign-in");
  }

  // Get the user's org context.
  const ctx = await getAuthContext();

  // ── Live Stats ───────────────────────────────────────────────────────────────
  const now = new Date();

  const [totalEvents, upcomingEvents, memberCount] = ctx
    ? await Promise.all([
        // Total events in the org
        prisma.event.count({
          where: { organizationId: ctx.orgId },
        }),
        // Upcoming events (startTime > now)
        prisma.event.count({
          where: {
            organizationId: ctx.orgId,
            startTime: { gt: now },
          },
        }),
        // Active members in the org
        prisma.membership.count({
          where: {
            organizationId: ctx.orgId,
            user: { deletedAt: null },
          },
        }),
      ])
    : [0, 0, 0];

  // Most recent upcoming event (for the quick-glance card)
  const nextEvent = ctx
    ? await prisma.event.findFirst({
        where: {
          organizationId: ctx.orgId,
          startTime: { gt: now },
        },
        orderBy: { startTime: "asc" },
      })
    : null;

  const stats = [
    {
      label: "Total Events",
      value: totalEvents,
      icon: Calendar,
      description: "Events created in your org",
      href: "/dashboard/events",
    },
    {
      label: "Upcoming",
      value: upcomingEvents,
      icon: Clock,
      description: "Events scheduled ahead",
      href: "/dashboard/events",
    },
    {
      label: "Members",
      value: memberCount,
      icon: Users,
      description: "Active org members",
      href: "/dashboard/settings",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your EventSync workspace.
        </p>
      </div>

      {/* KPI stats grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, description, href }) => (
          <Link key={label} href={href} className="group">
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Next upcoming event */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Upcoming Event</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextEvent ? (
              <div className="space-y-2">
                <p className="font-semibold leading-snug">{nextEvent.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(nextEvent.startTime))}
                </p>
                {nextEvent.location && (
                  <p className="text-xs text-muted-foreground">
                    📍 {nextEvent.location}
                  </p>
                )}
                <Link href={`/dashboard/events/${nextEvent.id}`}>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                    View Event <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No upcoming events scheduled.
                </p>
                <Link href="/dashboard/events">
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                    Create Event <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick access card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{upcomingEvents} upcoming</Badge>
              <Badge variant="outline">{totalEvents - upcomingEvents} past</Badge>
            </div>
            <CardDescription className="mt-1">
              View and manage your organization&apos;s events.
            </CardDescription>
            <Link href="/dashboard/events">
              <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                Go to Events <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {!ctx && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              No Organization Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Select or create an organization using the switcher in the sidebar
              to see your stats and events.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
