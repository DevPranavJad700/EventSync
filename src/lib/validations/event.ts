/**
 * lib/validations/event.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zod schemas for Event CRUD operations.
 *
 * These schemas are the single source of truth for validation and are used on
 * BOTH client (react-hook-form resolver) and server (Server Actions / Route
 * Handlers).  This guarantees that client-side feedback and server-side
 * rejection are always consistent.
 *
 * Adding a new field to Event?  Add it here first, then update schema.prisma.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Coerce a datetime-local string or Date to a JS Date object. */
const dateField = z.coerce.date();

// ─── Create / Update ─────────────────────────────────────────────────────────

/**
 * Schema for creating a new Event.
 * `organizationId` and `createdById` are injected server-side from the auth
 * context — they must NOT be accepted from the client form.
 */
export const createEventSchema = z
  .object({
    title: z
      .string()
      .min(2, "Title must be at least 2 characters")
      .max(120, "Title must be at most 120 characters"),
    description: z
      .string()
      .max(2000, "Description must be at most 2000 characters")
      .optional()
      .or(z.literal("")),
    location: z
      .string()
      .max(200, "Location must be at most 200 characters")
      .optional()
      .or(z.literal("")),
    startTime: dateField,
    endTime: dateField,
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

/**
 * Schema for updating an existing Event.
 * All fields are optional so the caller only sends changed fields.
 * The same startTime/endTime ordering constraint applies when both are present.
 */
export const updateEventSchema = z
  .object({
    title: z
      .string()
      .min(2, "Title must be at least 2 characters")
      .max(120, "Title must be at most 120 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Description must be at most 2000 characters")
      .optional()
      .or(z.literal("")),
    location: z
      .string()
      .max(200, "Location must be at most 200 characters")
      .optional()
      .or(z.literal("")),
    startTime: dateField.optional(),
    endTime: dateField.optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

// ─── Pagination ───────────────────────────────────────────────────────────────

/**
 * Cursor-based pagination query parameters.
 * `cursor` is the base64-encoded ID of the last item in the previous page.
 * `limit`  defaults to 10, max 100.
 */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
/** Pagination input — limit is optional on the caller side (schema provides default). */
export type PaginationInput = {
  cursor?: string;
  limit?: number;
};
