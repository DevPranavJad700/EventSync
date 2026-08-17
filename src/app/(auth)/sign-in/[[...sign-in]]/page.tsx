/**
 * app/(auth)/sign-in/[[...sign-in]]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Clerk Sign-In Page
 *
 * The `[[...sign-in]]` catch-all segment is required by Clerk's hosted UI so
 * that all Clerk auth sub-routes (OAuth callbacks, MFA steps, etc.) are handled
 * by this file without needing explicit routes for each step.
 *
 * Clerk reads NEXT_PUBLIC_CLERK_SIGN_IN_URL from env to know where to redirect
 * for unauthenticated requests — that value must match this route.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your EventSync account",
};

export default function SignInPage() {
  return <SignIn />;
}
