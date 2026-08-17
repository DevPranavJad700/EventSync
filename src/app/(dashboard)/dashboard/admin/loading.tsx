/**
 * app/(dashboard)/dashboard/admin/loading.tsx — Admin Loading Skeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown while the admin page server component fetches DB stats.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Tool cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-5 w-36" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-20 rounded-md mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
