/**
 * components/layout/RefreshButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Client component that calls router.refresh() to re-fetch server data
 * without a full page reload. Used on pages like the Webhook Audit Log
 * that display live DB state and benefit from a manual refresh trigger.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="gap-1.5"
      aria-label="Refresh data"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
