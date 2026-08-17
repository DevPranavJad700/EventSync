/**
 * app/(dashboard)/dashboard/events/[id]/page.tsx — Event Detail Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-detail view for a single event.
 * Server Component that:
 *   1. Validates the user's auth context
 *   2. Fetches the event scoped to the user's org (prevents IDOR)
 *   3. Shows all event fields + RBAC-gated Edit/Delete actions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthContext, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EditEventDialog } from "@/components/events/EventDialog";
import { DeleteEventButton } from "@/components/events/DeleteEventButton";
import { ExportCalendarButton } from "@/components/events/ExportCalendarButton";
import { RsvpButtons } from "@/components/events/RsvpButtons";
import { getRsvpCounts, getEventAttendees } from "@/app/(dashboard)/dashboard/events/rsvp-actions";
import { RsvpStatus } from "@prisma/client";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: event?.title ?? "Event" };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function durationLabel(start: Date, end: Date): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ctx = await getAuthContext();
  if (!ctx) redirect("/dashboard");

  // Fetch the event scoped to the current org (IDOR protection).
  const event = await prisma.event.findFirst({
    where: { id, organizationId: ctx.orgId },
    include: {
      createdBy: { select: { name: true, email: true, imageUrl: true } },
    },
  });

  if (!event) notFound();

  const canManage = hasRole(ctx.role, ["ADMIN", "MANAGER"]);
  const canDelete = hasRole(ctx.role, ["ADMIN"]);
  const isUpcoming = new Date(event.startTime) > new Date();

  const [rsvpRes, attendeesRes] = await Promise.all([
    getRsvpCounts(event.id),
    getEventAttendees(event.id),
  ]);

  const initialRsvpCounts = rsvpRes.success
    ? rsvpRes.data
    : { going: 0, maybe: 0, notGoing: 0, userStatus: null };

  const attendees = attendeesRes.success ? attendeesRes.data : [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      {/* Event header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={isUpcoming ? "default" : "secondary"}>
              {isUpcoming ? "Upcoming" : "Past"}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{event.title}</h2>
        </div>

        {/* Action buttons — Export always visible, Edit/Delete RBAC gated */}
        <div className="flex gap-2 shrink-0">
          {/* Add to Calendar — always available */}
          <ExportCalendarButton eventId={event.id} />

          {canManage && (
            <EditEventDialog
              event={event}
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              }
            />
          )}
          {canDelete && (
            <DeleteEventButton
              eventId={event.id}
              eventTitle={event.title}
            />
          )}
        </div>
      </div>

      {/* RSVP Section */}
      <Card>
        <CardContent className="pt-6">
          <RsvpButtons eventId={event.id} initialCounts={initialRsvpCounts} />
        </CardContent>
      </Card>

      {/* Detail cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Time card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Start</p>
              <p className="font-medium">{formatDate(event.startTime)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">End</p>
              <p className="font-medium">{formatDate(event.endTime)}</p>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">
                Duration: {durationLabel(event.startTime, event.endTime)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Location + creator card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {event.location ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Location</p>
                <p className="font-medium">{event.location}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No location set</p>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Created by</p>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{event.createdBy.name ?? event.createdBy.email}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Created on</p>
              <p className="text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(event.createdAt))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {event.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attendees list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Responses ({attendees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No responses yet. Be the first to RSVP!</p>
          ) : (
            <div className="divide-y divide-border">
              {attendees.map((attendee) => (
                <div key={attendee.user.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    {attendee.user.imageUrl ? (
                      <img
                        src={attendee.user.imageUrl}
                        alt={attendee.user.name ?? attendee.user.email}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                        {(attendee.user.name ?? attendee.user.email).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {attendee.user.name ?? attendee.user.email}
                      </p>
                      {attendee.user.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{attendee.user.email}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      attendee.status === RsvpStatus.GOING
                        ? "default"
                        : attendee.status === RsvpStatus.MAYBE
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {attendee.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

