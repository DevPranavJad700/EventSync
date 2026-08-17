/**
 * src/lib/logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Structured JSON Logger for Observability
 *
 * Produces structured JSON log output suitable for log aggregators (Datadog,
 * Logtail, CloudWatch) in production, with fallback to readable logs in dev.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogPayload {
  message: string;
  [key: string]: unknown;
}

class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const env = process.env.NODE_ENV || "development";

    if (env === "production") {
      return JSON.stringify({
        timestamp,
        level,
        message,
        environment: env,
        ...meta,
      });
    }

    // Friendly output for local dev
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.log(this.formatLog("info", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.formatLog("warn", message, meta));
  }

  error(message: string, meta?: Record<string, unknown>) {
    console.error(this.formatLog("error", message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, meta));
    }
  }
}

export const logger = new Logger();
