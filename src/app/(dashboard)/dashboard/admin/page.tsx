/**
 * app/(dashboard)/dashboard/admin/page.tsx — Admin Landing Page
 * ─────────────────────────────────────────────────────────────────────────────
 * RBAC Protected: Requires ADMIN role.
 * Shows admin-specific tools: Webhook Audit Log and Org Member Management.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Webhook, Users, ArrowRight, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const ctx = await requireRole(["ADMIN"]);

  // Fetch quick stats for the admin overview
  const [webhookCount, errorCount, memberCount] = await Promise.all([
    prisma.webhookEvent.count(),
    prisma.webhookEvent.count({ where: { status: "error" } }),
    prisma.membership.count({
      where: {
        organizationId: ctx.orgId,
        user: { deletedAt: null },
      },
    }),
  ]);

  const tools = [
    {
      title: "Webhook Audit Logs",
      description:
        "Inspect all Clerk sync events — processed, ignored, and errored deliveries with expandable raw payloads.",
      icon: Webhook,
      href: "/dashboard/admin/webhooks",
      badge: errorCount > 0 ? `${errorCount} error${errorCount > 1 ? "s" : ""}` : null,
      badgeVariant: "destructive" as const,
      stat: `${webhookCount} total events`,
    },
    {
      title: "Organization Members",
      description:
        "View and manage all members in your organization. Update roles and access via Clerk's organization settings.",
      icon: Users,
      href: "/dashboard/settings",
      badge: null,
      badgeVariant: "secondary" as const,
      stat: `${memberCount} active member${memberCount !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin</h2>
          <p className="text-muted-foreground">
            Administrative tools — visible to ADMIN role only.
          </p>
        </div>
      </div>

      {/* Admin tools grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map(({ title, description, icon: Icon, href, badge, badgeVariant, stat }) => (
          <Card key={title} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                {badge && (
                  <Badge variant={badgeVariant} className="shrink-0">
                    {badge}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{description}</CardDescription>
              <p className="text-xs text-muted-foreground font-medium">{stat}</p>
              <Link href={href}>
                <Button variant="outline" size="sm" className="gap-1.5 mt-1">
                  Open <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
