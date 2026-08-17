/**
 * app/(dashboard)/dashboard/events/page.tsx — Events Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Component that:
 *   1. Checks authentication and org membership
 *   2. Loads the first page of events from the DB
 *   3. Determines the user's RBAC permissions
 *   4. Passes everything to <EventsClient /> for client-side pagination
 *
 * This "server-then-client" pattern eliminates loading spinners on initial
 * page load while still supporting client-side interactivity (load more,
 * optimistic deletes, etc.).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventsClient } from "@/components/events/EventsClient";
import { CreateEventDialog } from "@/components/events/EventDialog";
import { ExportCalendarButton } from "@/components/events/ExportCalendarButton";
import { listEvents } from "./actions";
import { getAuthContext, hasRole } from "@/lib/rbac";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
};

export default async function EventsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Get the user's org context and role.
  const ctx = await getAuthContext();

  // If the user has no active org, prompt them to select/create one.
  if (!ctx) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No Organization Selected</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please select or create an organization using the switcher in the
          sidebar to view events.
        </p>
      </div>
    );
  }

  // Derive permissions from the user's role.
  const canManage = hasRole(ctx.role, ["ADMIN", "MANAGER"]);
  const canDelete = hasRole(ctx.role, ["ADMIN"]);

  // Load the first page of events server-side.
  const result = await listEvents({ limit: 9 });
  const initialEvents = result.success ? result.data.events : [];
  const initialNextCursor = result.success ? result.data.nextCursor : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Events</h2>
          <p className="text-muted-foreground">
            Manage your organization&apos;s events.
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Export all events as .ics — always visible (read action) */}
          <ExportCalendarButton />

          {/* Create button — only shown to ADMIN/MANAGER */}
          {canManage && (
            <CreateEventDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Event
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Events list with client-side pagination */}
      <EventsClient
        initialEvents={initialEvents}
        initialNextCursor={initialNextCursor}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
