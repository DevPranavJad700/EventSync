/**
 * components/layout/ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the app in next-themes ThemeProvider so all components can read and
 * toggle the active theme (light / dark / system).
 *
 * Must be a Client Component because ThemeProvider uses React context.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
