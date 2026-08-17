/**
 * app/layout.tsx — Root Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * The root layout wraps the entire application in ClerkProvider which makes
 * auth state available to all server and client components via Clerk hooks.
 *
 * ThemeProvider (next-themes) enables dark/light/system theme switching.
 * The <Toaster /> component from sonner is included here so toast notifications
 * are available globally without needing to add it to every page layout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EventSync",
    template: "%s | EventSync",
  },
  description:
    "A production-ready, role-based SaaS boilerplate built with Next.js, Clerk, NeonDB, and Prisma.",
  openGraph: {
    siteName: "EventSync",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
