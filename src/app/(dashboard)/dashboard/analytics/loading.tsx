/**
 * app/(dashboard)/dashboard/analytics/loading.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown while the analytics server component fetches data from the DB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-14 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Full-width bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-60 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Donut */}
        <Card>
          <CardHeader className="pb-2 space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-52" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-60 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Day of week bar chart */}
        <Card>
          <CardHeader className="pb-2 space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-60 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Top creators */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
