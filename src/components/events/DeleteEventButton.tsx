/**
 * components/events/DeleteEventButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A standalone delete button that uses the shadcn AlertDialog for confirmation
 * instead of the browser's native window.confirm().
 *
 * Built on @base-ui/react AlertDialog (same as the rest of the UI kit).
 * AlertDialogTrigger uses a `render` prop (not asChild).
 * AlertDialogAction wraps a Button directly.
 * AlertDialogCancel uses AlertDialogPrimitive.Close with render.
 *
 * Used from:
 *   - EventsClient.tsx (inline on event cards)
 *   - Event detail page [id]/page.tsx (header action)
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteEvent } from "@/app/(dashboard)/dashboard/events/actions";

interface DeleteEventButtonProps {
  eventId: string;
  eventTitle: string;
  /** Called after a successful delete (e.g. to remove from local list). */
  onDeleted?: (id: string) => void;
  /** Size variant for the trigger button. */
  size?: "sm" | "default";
}

export function DeleteEventButton({
  eventId,
  eventTitle,
  onDeleted,
  size = "sm",
}: DeleteEventButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteEvent(eventId);
      if (result.success) {
        toast.success("Event deleted successfully.");
        setOpen(false);
        if (onDeleted) {
          onDeleted(eventId);
        } else {
          // If no callback (e.g. on the detail page), navigate back to the list.
          router.push("/dashboard/events");
        }
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* AlertDialogTrigger uses render= prop (base-ui pattern, not asChild) */}
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size={size}
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              &quot;{eventTitle}&quot;
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? "Deleting…" : "Delete Event"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
