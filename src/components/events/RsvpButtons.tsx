/**
 * components/events/RsvpButtons.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Client Component — RSVP Buttons (Going / Maybe / Not Going)
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useTransition } from "react";
import { Check, HelpCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { upsertRsvp, type RsvpCounts } from "@/app/(dashboard)/dashboard/events/rsvp-actions";
import { RsvpStatus } from "@prisma/client";

interface RsvpButtonsProps {
  eventId: string;
  initialCounts: RsvpCounts;
}

export function RsvpButtons({ eventId, initialCounts }: RsvpButtonsProps) {
  const [counts, setCounts] = useState<RsvpCounts>(initialCounts);
  const [isPending, startTransition] = useTransition();

  const handleRsvp = (newStatus: RsvpStatus) => {
    if (counts.userStatus === newStatus || isPending) return;

    // Optimistic UI update
    const prevStatus = counts.userStatus;
    setCounts((prev) => {
      const next = { ...prev, userStatus: newStatus };
      if (prevStatus === RsvpStatus.GOING) next.going = Math.max(0, next.going - 1);
      if (prevStatus === RsvpStatus.MAYBE) next.maybe = Math.max(0, next.maybe - 1);
      if (prevStatus === RsvpStatus.NOT_GOING) next.notGoing = Math.max(0, next.notGoing - 1);

      if (newStatus === RsvpStatus.GOING) next.going += 1;
      if (newStatus === RsvpStatus.MAYBE) next.maybe += 1;
      if (newStatus === RsvpStatus.NOT_GOING) next.notGoing += 1;

      return next;
    });

    startTransition(async () => {
      const res = await upsertRsvp(eventId, newStatus);
      if (!res.success) {
        toast.error(res.error);
        // Rollback
        setCounts(initialCounts);
      } else {
        toast.success(`RSVP updated to ${newStatus.replace("_", " ")}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Your Attendance RSVP
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={counts.userStatus === RsvpStatus.GOING ? "default" : "outline"}
          size="sm"
          onClick={() => handleRsvp(RsvpStatus.GOING)}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending && counts.userStatus === RsvpStatus.GOING ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Going ({counts.going})
        </Button>

        <Button
          variant={counts.userStatus === RsvpStatus.MAYBE ? "secondary" : "outline"}
          size="sm"
          onClick={() => handleRsvp(RsvpStatus.MAYBE)}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending && counts.userStatus === RsvpStatus.MAYBE ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <HelpCircle className="h-3.5 w-3.5" />
          )}
          Maybe ({counts.maybe})
        </Button>

        <Button
          variant={counts.userStatus === RsvpStatus.NOT_GOING ? "destructive" : "outline"}
          size="sm"
          onClick={() => handleRsvp(RsvpStatus.NOT_GOING)}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending && counts.userStatus === RsvpStatus.NOT_GOING ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Not Going ({counts.notGoing})
        </Button>
      </div>
    </div>
  );
}
