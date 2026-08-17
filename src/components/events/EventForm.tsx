/**
 * components/events/EventForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable Event Create/Edit Form
 *
 * Uses react-hook-form with the Zod resolver so validation runs on the client
 * first (fast feedback) and then again on the server inside the action
 * (security).
 *
 * Props:
 *   initialData  — if provided, the form is in "edit" mode (fields pre-filled).
 *   onSubmit     — async callback; receives the validated form data.
 *   isSubmitting — parent controls the loading state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createEventSchema } from "@/lib/validations/event";
import type { Event } from "@prisma/client";

// Use a string-based form schema so inputs (which are always strings/undefined)
// work cleanly with react-hook-form, and we coerce to Date on the server.
const formSchema = z
  .object({
    title: z
      .string()
      .min(2, "Title must be at least 2 characters")
      .max(120, "Title must be at most 120 characters"),
    description: z.string().max(2000).optional().or(z.literal("")),
    location: z.string().max(200).optional().or(z.literal("")),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );

type FormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  /** Pre-populated data for edit mode. If omitted, form starts empty (create mode). */
  initialData?: Partial<Event>;
  /** Called with validated data when the user submits the form. */
  onSubmit: (data: z.infer<typeof createEventSchema>) => Promise<void>;
  /** Disables inputs and shows a loading state on the submit button. */
  isSubmitting: boolean;
}

/** Converts a Date to a datetime-local input value (YYYY-MM-DDTHH:mm). */
function toDateTimeLocalValue(date?: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 16);
}

export function EventForm({ initialData, onSubmit, isSubmitting }: EventFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      location: initialData?.location ?? "",
      startTime: initialData?.startTime
        ? toDateTimeLocalValue(initialData.startTime)
        : "",
      endTime: initialData?.endTime
        ? toDateTimeLocalValue(initialData.endTime)
        : "",
    },
  });

  async function handleValid(values: FormValues) {
    // Coerce string dates to Date objects before passing to the action.
    await onSubmit({
      title: values.title,
      description: values.description,
      location: values.location,
      startTime: new Date(values.startTime),
      endTime: new Date(values.endTime),
    });
  }

  return (
    <form onSubmit={handleSubmit(handleValid)} className="space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Q3 All-Hands Meeting"
          disabled={isSubmitting}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What's this event about?"
          rows={3}
          disabled={isSubmitting}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Conference Room A / Zoom link"
          disabled={isSubmitting}
          {...register("location")}
        />
        {errors.location && (
          <p className="text-xs text-destructive">{errors.location.message}</p>
        )}
      </div>

      {/* Start / End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="startTime">
            Start Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startTime"
            type="datetime-local"
            disabled={isSubmitting}
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="text-xs text-destructive">
              {errors.startTime.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="endTime">
            End Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="endTime"
            type="datetime-local"
            disabled={isSubmitting}
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="text-xs text-destructive">
              {errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Saving…"
          : initialData?.id
          ? "Save Changes"
          : "Create Event"}
      </Button>
    </form>
  );
}
