/**
 * components/layout/Topbar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard Top Navigation Bar
 *
 * Contains:
 *   - Dynamic page title / breadcrumb derived from the current pathname
 *   - Dark/Light theme toggle
 *   - Clerk's <UserButton /> for account management (sign out, profile, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";

/** Maps path segments to human-readable labels. */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  analytics: "Analytics",
  settings: "Settings",
  admin: "Admin",
  webhooks: "Webhook Logs",
};

/** Derive a page title from the current pathname. */
function deriveTitleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // Return the label of the deepest known segment, or a formatted fallback.
  for (let i = segments.length - 1; i >= 0; i--) {
    const label = SEGMENT_LABELS[segments[i]];
    if (label) return label;
  }
  // Fallback: capitalise the last segment.
  const last = segments[segments.length - 1];
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : "Dashboard";
}

export function Topbar() {
  const pathname = usePathname();
  const title = deriveTitleFromPath(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      {/* Dynamic page title */}
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Dark / light theme toggle */}
        <ThemeToggle />

        {/* User account menu */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
