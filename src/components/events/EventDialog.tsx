/**
 * components/events/EventDialog.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal dialog wrapping <EventForm /> for creating and editing events.
 *
 * Handles the async action call, displays toast feedback, and closes the
 * dialog on success.
 *
 * Note: This uses @base-ui/react's Dialog which passes trigger behavior via
 * the DialogTrigger component wrapping any clickable element.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EventForm } from "./EventForm";
import { createEvent, updateEvent } from "@/app/(dashboard)/dashboard/events/actions";
import type { CreateEventInput } from "@/lib/validations/event";
import type { Event } from "@prisma/client";

// ─── Create Dialog ─────────────────────────────────────────────────────────────

interface CreateEventDialogProps {
  /** The trigger element (e.g., a Button) that opens the dialog. */
  trigger: React.ReactNode;
}

export function CreateEventDialog({ trigger }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(data: CreateEventInput) {
    setIsSubmitting(true);
    try {
      const result = await createEvent(data);
      if (result.success) {
        toast.success("Event created successfully!");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* DialogTrigger renders the trigger element directly to prevent nested <button> elements */}
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <EventForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ───────────────────────────────────────────────────────────────

interface EditEventDialogProps {
  event: Event;
  trigger: React.ReactNode;
}

export function EditEventDialog({ event, trigger }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEdit(data: CreateEventInput) {
    setIsSubmitting(true);
    try {
      const result = await updateEvent(event.id, data);
      if (result.success) {
        toast.success("Event updated successfully!");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <EventForm
          initialData={event}
          onSubmit={handleEdit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
