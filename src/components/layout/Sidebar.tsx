/**
 * components/layout/Sidebar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard Sidebar
 *
 * Contains:
 *   - App brand/logo
 *   - Main navigation links (Dashboard, Events, Admin, Settings)
 *   - Clerk's <OrganizationSwitcher /> for multi-tenant org selection
 *
 * The OrganizationSwitcher is the key multi-tenancy UI element: it shows the
 * active org, allows switching between orgs the user belongs to, and lets them
 * create new organizations (if your Clerk plan allows it).
 *
 * Extending for a new SaaS:
 *   Add new <NavItem> entries below for each top-level section of your app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { Calendar, Settings, LayoutDashboard, ShieldCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Navigation Items ─────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const pathname = usePathname();
  // Mark as active if the pathname matches exactly OR is a child route,
  // but avoid marking /dashboard as active when on /dashboard/events, etc.
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItemProps[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/events", icon: Calendar, label: "Events" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/admin", icon: ShieldCheck, label: "Admin" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-primary-foreground">ES</span>
        </div>
        <span className="font-semibold tracking-tight">EventSync</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Organization Switcher — pinned to the bottom of the sidebar */}
      <div className="border-t p-3">
        <OrganizationSwitcher
          // Hide the "Personal Account" option since this is a multi-org SaaS.
          hidePersonal
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-start rounded-md px-3 py-2 text-sm hover:bg-accent",
            },
          }}
        />
      </div>
    </aside>
  );
}
