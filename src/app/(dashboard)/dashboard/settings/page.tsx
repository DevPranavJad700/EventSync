/**
 * app/(dashboard)/dashboard/settings/page.tsx — Settings Placeholder
 * ─────────────────────────────────────────────────────────────────────────────
 * Placeholder settings page. Replace with real settings forms when extending
 * this boilerplate for your SaaS product.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { OrganizationProfile } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization settings and members.
        </p>
      </div>
      {/* Clerk's built-in org management UI — includes member invites, roles, etc. */}
      <OrganizationProfile routing="hash" />
    </div>
  );
}
