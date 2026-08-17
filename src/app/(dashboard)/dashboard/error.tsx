/**
 * app/(dashboard)/dashboard/error.tsx — Dashboard Error Boundary
 * ─────────────────────────────────────────────────────────────────────────────
 * Catches unhandled errors thrown during rendering within the dashboard
 * route group. Replaces the Next.js default crash screen.
 *
 * Must be a Client Component — Next.js requires it for error boundaries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console and send to Sentry error tracker
    console.error("[DashboardError]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Try refreshing the page, or click the
          button below to retry.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
