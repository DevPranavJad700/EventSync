/**
 * app/(auth)/sign-up/[[...sign-up]]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Clerk Sign-Up Page
 *
 * Same pattern as sign-in — the catch-all segment handles Clerk's multi-step
 * registration flow (email verification, OAuth, etc.) without extra routes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your EventSync account",
};

export default function SignUpPage() {
  return <SignUp />;
}
