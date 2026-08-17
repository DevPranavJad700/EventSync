/**
 * app/(dashboard)/dashboard/admin/webhooks/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Webhook Audit Log Admin Dashboard
 *
 * RBAC Protected: Requires ADMIN role.
 * Displays real-time telemetry, status badges, error logs, and raw JSON payloads
 * for the 50 most recent processed Clerk webhook events.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldAlert, Webhook, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { RefreshButton } from "@/components/layout/RefreshButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Webhook Audit Logs",
};


function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "processed":
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Processed
        </Badge>
      );
    case "ignored":
      return (
        <Badge variant="secondary">
          <Info className="mr-1 h-3 w-3" /> Ignored
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" /> Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function WebhookLogsPage() {
  // 1. RBAC Guard: ADMIN role only
  await requireRole(["ADMIN"]);

  // 2. Query recent 50 webhook events
  const logs = await prisma.webhookEvent.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  const totalCount = logs.length;
  const processedCount = logs.filter((l) => l.status === "processed").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhook Audit Logs</h2>
          <p className="text-muted-foreground">
            Real-time telemetry and audit trail of Clerk sync events.
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Logged Events</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Last 50 recorded deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{processedCount}</div>
            <p className="text-xs text-muted-foreground">Successful DB sync actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <p className="text-xs text-muted-foreground">Unhandled processing failures</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Deliveries</CardTitle>
          <CardDescription>
            Showing recent events verified via Svix signature headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
              No webhook events recorded yet. Webhooks from Clerk will appear here live.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Svix ID</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-medium">{log.eventType}</td>
                      <td className="p-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {log.svixId}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        {log.error ? (
                          <span className="text-xs text-destructive font-mono truncate max-w-xs block">
                            {log.error}
                          </span>
                        ) : (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-primary font-medium">View Payload</summary>
                            <pre className="mt-2 max-h-40 overflow-y-auto rounded bg-muted p-2 text-[10px] font-mono text-muted-foreground">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
