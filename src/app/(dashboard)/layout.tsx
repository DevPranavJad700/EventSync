/**
 * app/(dashboard)/layout.tsx — Dashboard Shell Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides the persistent sidebar + topbar shell for all dashboard pages.
 * Uses a route group `(dashboard)` so the layout applies to all child routes
 * without affecting the URL structure.
 *
 * This layout is a Server Component — it doesn't need to be a Client Component
 * because the Sidebar and Topbar handle their own client-side state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed-width sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
