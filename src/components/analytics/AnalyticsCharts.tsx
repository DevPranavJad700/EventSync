/**
 * components/analytics/AnalyticsCharts.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Client Component — renders all analytics charts using Recharts.
 *
 * Receives pre-computed, serialized data from the server page component.
 * No DB access here — purely presentational.
 *
 * Charts rendered:
 *   1. Events per Month — BarChart (last 6 months)
 *   2. Upcoming vs Past — PieChart / donut
 *   3. Events by Day of Week — BarChart
 *   4. Top Event Creators — horizontal BarChart
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";
import type { AnalyticsData } from "@/app/(dashboard)/dashboard/analytics/page";

// ─── Colour Palettes ──────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary: "#6366f1",   // indigo-500
  secondary: "#8b5cf6", // violet-500
  upcoming: "#22c55e",  // green-500
  past: "#94a3b8",      // slate-400
  warning: "#f59e0b",   // amber-500
  pie: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"],
  grid: "var(--border)",
  text: "var(--muted-foreground)",
};

// ─── Tooltip & Cursor Styles ──────────────────────────────────────────────────

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "8px",
  color: "var(--card-foreground)",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};

const cursorStyle = {
  fill: "rgba(99, 102, 241, 0.08)",
};

// ─── Empty Chart State ────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground" suppressHydrationWarning>
      {message}
    </div>
  );
}

// ─── Custom Labels ─────────────────────────────────────────────────────────────

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function PieLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: PieLabelProps) {
  if (percent < 0.05) return null; // hide tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const mounted = useMounted();

  const { monthlyEvents, eventsByDay, topCreators, upcomingEvents, pastEvents } = data;

  const splitData = [
    { name: "Upcoming", value: upcomingEvents },
    { name: "Past", value: pastEvents },
  ].filter((d) => d.value > 0);

  const hasAnyEvents = data.totalEvents > 0;

  if (!mounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" suppressHydrationWarning>
        <Card className="lg:col-span-2" suppressHydrationWarning>
          <CardHeader suppressHydrationWarning>
            <CardTitle className="text-base">Events Created per Month</CardTitle>
            <CardDescription>Last 6 months — shows creation activity trends</CardDescription>
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="h-[240px] w-full animate-pulse rounded-md bg-muted/20" />
          </CardContent>
        </Card>

        <Card suppressHydrationWarning>
          <CardHeader suppressHydrationWarning>
            <CardTitle className="text-base">Upcoming vs Past</CardTitle>
            <CardDescription>Split of scheduled vs completed events</CardDescription>
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="h-[240px] w-full animate-pulse rounded-md bg-muted/20" />
          </CardContent>
        </Card>

        <Card suppressHydrationWarning>
          <CardHeader suppressHydrationWarning>
            <CardTitle className="text-base">Events by Day of Week</CardTitle>
            <CardDescription>Which days events are most commonly scheduled</CardDescription>
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="h-[240px] w-full animate-pulse rounded-md bg-muted/20" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" suppressHydrationWarning>
          <CardHeader suppressHydrationWarning>
            <CardTitle className="text-base">Top Event Creators</CardTitle>
            <CardDescription>Members who have created the most events in this org</CardDescription>
          </CardHeader>
          <CardContent suppressHydrationWarning>
            <div className="h-[160px] w-full animate-pulse rounded-md bg-muted/20" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2" suppressHydrationWarning>

      {/* Chart 1 — Events per Month */}
      <Card className="lg:col-span-2" suppressHydrationWarning>
        <CardHeader suppressHydrationWarning>
          <CardTitle className="text-base">Events Created per Month</CardTitle>
          <CardDescription>Last 6 months — shows creation activity trends</CardDescription>
        </CardHeader>
        <CardContent suppressHydrationWarning>
          {!hasAnyEvents ? (
            <EmptyChart message="No events yet — create some to see trends." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyEvents} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={cursorStyle}
                />
                <Bar
                  dataKey="count"
                  name="Events Created"
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart 2 — Upcoming vs Past Donut */}
      <Card suppressHydrationWarning>
        <CardHeader suppressHydrationWarning>
          <CardTitle className="text-base">Upcoming vs Past</CardTitle>
          <CardDescription>Split of scheduled vs completed events</CardDescription>
        </CardHeader>
        <CardContent suppressHydrationWarning>
          {splitData.length === 0 ? (
            <EmptyChart message="No events to display." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={splitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={PieLabel}
                >
                  <Cell fill={CHART_COLORS.upcoming} />
                  <Cell fill={CHART_COLORS.past} />
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: CHART_COLORS.text }}>{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart 3 — Events by Day of Week */}
      <Card suppressHydrationWarning>
        <CardHeader suppressHydrationWarning>
          <CardTitle className="text-base">Events by Day of Week</CardTitle>
          <CardDescription>Which days events are most commonly scheduled</CardDescription>
        </CardHeader>
        <CardContent suppressHydrationWarning>
          {!hasAnyEvents ? (
            <EmptyChart message="No events yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eventsByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={cursorStyle}
                />
                <Bar
                  dataKey="count"
                  name="Events"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart 4 — Top Event Creators */}
      <Card className="lg:col-span-2" suppressHydrationWarning>
        <CardHeader suppressHydrationWarning>
          <CardTitle className="text-base">Top Event Creators</CardTitle>
          <CardDescription>Members who have created the most events in this org</CardDescription>
        </CardHeader>
        <CardContent suppressHydrationWarning>
          {topCreators.length === 0 ? (
            <EmptyChart message="No events created yet." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, topCreators.length * 48)}>
              <BarChart
                data={topCreators}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={cursorStyle}
                />
                <Bar
                  dataKey="count"
                  name="Events Created"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

