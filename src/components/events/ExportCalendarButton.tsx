/**
 * components/events/ExportCalendarButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Client button that triggers a download of the .ics calendar file from
 * GET /api/events/export (or GET /api/events/export?id=<id> for single events).
 *
 * Uses native <a href> download rather than fetch() so the browser handles
 * the file download prompt without us needing to blob it manually.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { CalendarArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

interface ExportCalendarButtonProps {
  /** If provided, exports a single event. Otherwise exports all org events. */
  eventId?: string;
  /** Button label — default differs between single vs all */
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
}

export function ExportCalendarButton({
  eventId,
  label,
  variant = "outline",
  size = "sm",
}: ExportCalendarButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const defaultLabel = eventId ? "Add to Calendar" : "Export All (.ics)";
  const buttonLabel = label ?? defaultLabel;

  const href = eventId
    ? `/api/events/export?id=${eventId}`
    : `/api/events/export`;

  async function handleClick() {
    setIsLoading(true);
    try {
      // Trigger the download via a temporary anchor
      const a = document.createElement("a");
      a.href = href;
      a.download = ""; // Let the server Content-Disposition header name the file
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Calendar file downloaded.");
    } catch {
      toast.error("Failed to download calendar file.");
    } finally {
      // Give a short delay so users can see the button change state
      setTimeout(() => setIsLoading(false), 1500);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className="gap-1.5"
      aria-label={buttonLabel}
    >
      <CalendarArrowDown className="h-3.5 w-3.5" />
      {isLoading ? "Downloading…" : buttonLabel}
    </Button>
  );
}
