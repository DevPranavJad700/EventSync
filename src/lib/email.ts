/**
 * src/lib/email.ts — Resend Transactional Email Client & Helpers
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides transactional email notification capabilities via Resend.
 *
 * Safe Protocol:
 *   - If `RESEND_API_KEY` is not present, email operations log a info/warn message
 *     and complete without throwing, preserving full app functionality.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "EventSync <notifications@eventsync.app>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendNewEventEmailParams {
  to: string[];
  eventTitle: string;
  eventDescription?: string | null;
  startTime: Date;
  location?: string | null;
  orgName: string;
  eventUrl: string;
}

/** Render a clean, modern HTML email for new event notifications */
function renderNewEventEmailHtml(params: SendNewEventEmailParams): string {
  const { eventTitle, eventDescription, startTime, location, orgName, eventUrl } = params;
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(startTime));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; padding: 32px; }
          .badge { display: inline-block; background: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; }
          h1 { font-size: 22px; font-weight: 700; margin-top: 16px; margin-bottom: 8px; color: #09090b; }
          .meta { font-size: 14px; color: #71717a; margin-bottom: 20px; }
          .details-card { background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 4px; padding: 16px; margin: 20px 0; }
          .details-item { margin-bottom: 8px; font-size: 14px; }
          .details-item strong { color: #334155; }
          .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 24px; font-size: 14px; }
          .footer { margin-top: 32px; font-size: 12px; color: #a1a1aa; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">${orgName}</span>
          <h1>New Event: ${eventTitle}</h1>
          <p class="meta">A new event has been scheduled for your organization.</p>
          
          <div class="details-card">
            <div class="details-item"><strong>📅 When:</strong> ${formattedDate}</div>
            ${location ? `<div class="details-item"><strong>📍 Location:</strong> ${location}</div>` : ""}
            ${eventDescription ? `<div class="details-item"><strong>📝 Description:</strong> ${eventDescription}</div>` : ""}
          </div>

          <a href="${eventUrl}" class="btn">View Event & RSVP</a>

          <div class="footer">
            Sent by EventSync for ${orgName} • Multi-Tenant Event Management
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sends a notification email to members when a new event is created.
 * Gracefully logs and skips if RESEND_API_KEY is not configured.
 */
export async function sendNewEventEmail(params: SendNewEventEmailParams): Promise<boolean> {
  if (!resend) {
    logger.info("Resend API key not configured — skipping email dispatch", {
      eventTitle: params.eventTitle,
      recipientCount: params.to.length,
    });
    return false;
  }

  if (!params.to || params.to.length === 0) {
    return false;
  }

  try {
    const html = renderNewEventEmailHtml(params);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: `New Event: ${params.eventTitle} (${params.orgName})`,
      html,
    });

    if (error) {
      logger.error("Resend email delivery error", { error, eventTitle: params.eventTitle });
      return false;
    }

    logger.info("New event notification email dispatched successfully", {
      eventTitle: params.eventTitle,
      recipients: params.to.length,
    });
    return true;
  } catch (err) {
    logger.error("Failed to send email notification", { err });
    return false;
  }
}
