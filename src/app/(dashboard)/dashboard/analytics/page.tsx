/**
 * app/(dashboard)/dashboard/analytics/page.tsx — Analytics Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Component: fetches all analytics data via Prisma and passes it as
 * plain serializable props to the AnalyticsCharts client component.
 *
 * Queries (all scoped to the user's active orgId):
 *   1. KPI totals — total events, upcoming, past, members
 *   2. Events per month — last 6 months (for the bar chart)
 *   3. Events by day of week — Sun–Sat distribution
 *   4. Top 5 event creators — who created the most events
 *   5. Upcoming vs past split — for the donut chart
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAuthContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { Calendar, Clock, Users, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

// ─── Data helpers ─────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface MonthlyData {
  month: string;   // e.g. "Jan 2026"
  count: number;
}

export interface DayData {
  day: string;     // e.g. "Mon"
  count: number;
}

export interface CreatorData {
  name: string;
  count: number;
}

export interface AnalyticsData {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalMembers: number;
  monthlyEvents: MonthlyData[];
  eventsByDay: DayData[];
  topCreators: CreatorData[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ctx = await getAuthContext();
  if (!ctx) redirect("/dashboard");

  const now = new Date();

  // ── Parallel DB queries ───────────────────────────────────────────────────
  const [totalEvents, upcomingEvents, totalMembers, allEvents] =
    await Promise.all([
      // 1. Total events in org
      prisma.event.count({ where: { organizationId: ctx.orgId } }),

      // 2. Upcoming events
      prisma.event.count({
        where: { organizationId: ctx.orgId, startTime: { gt: now } },
      }),

      // 3. Member count
      prisma.membership.count({
        where: { organizationId: ctx.orgId, user: { deletedAt: null } },
      }),

      // 4. All events with createdAt, startTime, and creator name (for grouping)
      prisma.event.findMany({
        where: { organizationId: ctx.orgId },
        select: {
          createdAt: true,
          startTime: true,
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const pastEvents = totalEvents - upcomingEvents;

  // ── Events per month (last 6 months) ─────────────────────────────────────
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Build a map of "YYYY-MM" → count
  const monthCountMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCountMap.set(key, 0);
  }

  for (const event of allEvents) {
    const d = new Date(event.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthCountMap.has(key)) {
      monthCountMap.set(key, (monthCountMap.get(key) ?? 0) + 1);
    }
  }

  const monthlyEvents: MonthlyData[] = Array.from(monthCountMap.entries()).map(
    ([key, count]) => {
      const [year, month] = key.split("-");
      return {
        month: `${MONTHS[parseInt(month) - 1]} ${year}`,
        count,
      };
    }
  );

  // ── Events by day of week ─────────────────────────────────────────────────
  const dayCountMap = new Map<number, number>(
    [0, 1, 2, 3, 4, 5, 6].map((d) => [d, 0])
  );
  for (const event of allEvents) {
    const day = new Date(event.startTime).getDay(); // 0=Sun, 6=Sat
    dayCountMap.set(day, (dayCountMap.get(day) ?? 0) + 1);
  }
  const eventsByDay: DayData[] = Array.from(dayCountMap.entries()).map(
    ([day, count]) => ({ day: DAYS[day], count })
  );

  // ── Top 5 event creators ──────────────────────────────────────────────────
  const creatorMap = new Map<string, number>();
  for (const event of allEvents) {
    const name = event.createdBy.name ?? event.createdBy.email ?? "Unknown";
    creatorMap.set(name, (creatorMap.get(name) ?? 0) + 1);
  }
  const topCreators: CreatorData[] = Array.from(creatorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // ── Compose analytics data ────────────────────────────────────────────────
  const analytics: AnalyticsData = {
    totalEvents,
    upcomingEvents,
    pastEvents,
    totalMembers,
    monthlyEvents,
    eventsByDay,
    topCreators,
  };

  const kpis = [
    {
      label: "Total Events",
      value: totalEvents,
      icon: Calendar,
      sub: "all time",
    },
    {
      label: "Upcoming",
      value: upcomingEvents,
      icon: Clock,
      sub: "scheduled ahead",
    },
    {
      label: "Past Events",
      value: pastEvents,
      icon: TrendingUp,
      sub: "completed",
    },
    {
      label: "Members",
      value: totalMembers,
      icon: Users,
      sub: "active in org",
    },
  ];

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Page header */}
      <div suppressHydrationWarning>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Real data from your organization&apos;s events.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" suppressHydrationWarning>
        {kpis.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label} suppressHydrationWarning>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" suppressHydrationWarning>
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent suppressHydrationWarning>
              <div className="text-3xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts — client component, receives pre-serialized data */}
      <AnalyticsCharts data={analytics} />
    </div>
  );
}

