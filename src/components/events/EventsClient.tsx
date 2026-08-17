/**
 * components/events/EventsClient.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Client Component — Events List with Cursor Pagination, Search & Filter
 *
 * This is a "progressive enhancement" component:
 *   - The server page (`events/page.tsx`) fetches the first page and passes it
 *     as `initialEvents` and `initialNextCursor`.
 *   - This client component renders that initial data instantly (no loading
 *     spinner on first render).
 *   - When the user clicks "Load More", it calls the `listEvents` server action
 *     to fetch the next page and appends results to the local list.
 *
 * Features:
 *   - Title search (client-side filter on loaded events)
 *   - Status filter: All / Upcoming / Past
 *   - RBAC-aware Create/Edit/Delete buttons
 *   - AlertDialog-based delete confirmation (replaces window.confirm)
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, MapPin, Clock, Plus, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateEventDialog, EditEventDialog } from "./EventDialog";
import { DeleteEventButton } from "./DeleteEventButton";
import { listEvents } from "@/app/(dashboard)/dashboard/events/actions";
import type { Event } from "@prisma/client";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "upcoming" | "past";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function isUpcoming(startTime: Date): boolean {
  return new Date(startTime) > new Date();
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  canManage,
  hasFilters,
}: {
  canManage: boolean;
  hasFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <h3 className="text-lg font-semibold">
        {hasFilters ? "No matching events" : "No events yet"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filter."
          : canManage
          ? "Get started by creating your first event."
          : "Your organization hasn't created any events yet."}
      </p>
      {!hasFilters && canManage && (
        <CreateEventDialog
          trigger={
            <Button className="mt-6" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          }
        />
      )}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: Event;
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
}

function EventCard({ event, canManage, canDelete, onDeleted }: EventCardProps) {
  const upcoming = isUpcoming(event.startTime);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="hover:underline"
            >
              <CardTitle className="text-base leading-snug truncate">
                {event.title}
              </CardTitle>
            </Link>
            {event.description && (
              <CardDescription className="line-clamp-2">
                {event.description}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={upcoming ? "default" : "secondary"}
            className="shrink-0"
          >
            {upcoming ? "Upcoming" : "Past"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Times */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {formatDate(event.startTime)} → {formatDate(event.endTime)}
          </span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Action buttons (RBAC-gated) */}
        {(canManage || canDelete) && (
          <div className="flex gap-2 pt-2">
            {canManage && (
              <EditEventDialog
                event={event}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                }
              />
            )}
            {canDelete && (
              <DeleteEventButton
                eventId={event.id}
                eventTitle={event.title}
                onDeleted={onDeleted}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function EventsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface EventsClientProps {
  initialEvents: Event[];
  initialNextCursor: string | null;
  /** True if the current user has ADMIN or MANAGER role. */
  canManage: boolean;
  /** True if the current user has ADMIN role (for delete). */
  canDelete: boolean;
}

export function EventsClient({
  initialEvents,
  initialNextCursor,
  canManage,
  canDelete,
}: EventsClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  // ── Real-Time SSE Subscription ──────────────────────────────────────────────
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource("/api/events/stream");

      eventSource.addEventListener("update", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          toast.info(`Real-time update: Event "${data.title}" was updated!`, {
            duration: 3000,
          });
          router.refresh();
        } catch {
          router.refresh();
        }
      });
    } catch {
      // Stream failed or not supported, fallback silently
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [router]);

  // ── Search & Filter state ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ── Client-side filtered view ────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by title search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q)
      );
    }

    // Filter by status
    const now = new Date();
    if (statusFilter === "upcoming") {
      result = result.filter((e) => new Date(e.startTime) > now);
    } else if (statusFilter === "past") {
      result = result.filter((e) => new Date(e.startTime) <= now);
    }

    return result;
  }, [events, search, statusFilter]);

  const hasFilters = search.trim() !== "" || statusFilter !== "all";

  // Load the next page of events.
  function handleLoadMore() {
    if (!nextCursor || isPending) return;

    startTransition(async () => {
      const result = await listEvents({ cursor: nextCursor, limit: 9 });
      if (result.success) {
        setEvents((prev) => [...prev, ...result.data.events]);
        setNextCursor(result.data.nextCursor);
      } else {
        toast.error(result.error);
      }
    });
  }

  // Remove a deleted event from local state.
  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event deleted.");
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            id="event-search"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "upcoming", "past"] as StatusFilter[]).map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Count label */}
      {events.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredEvents.length}{" "}
          {filteredEvents.length === 1 ? "event" : "events"}
          {hasFilters ? ` (filtered from ${events.length} total)` : ""}
        </p>
      )}

      {/* Empty state */}
      {filteredEvents.length === 0 && (
        <EmptyState canManage={canManage} hasFilters={hasFilters} />
      )}

      {/* Events grid */}
      {filteredEvents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              canManage={canManage}
              canDelete={canDelete}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Load more / loading skeleton */}
      {isPending && <EventsSkeleton />}

      {nextCursor && !isPending && !hasFilters && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore} disabled={isPending}>
            Load More
          </Button>
        </div>
      )}

      {!nextCursor && events.length > 0 && !hasFilters && (
        <p className="text-center text-sm text-muted-foreground pt-4">
          You&apos;ve reached the end of the list.
        </p>
      )}
    </div>
  );
}
