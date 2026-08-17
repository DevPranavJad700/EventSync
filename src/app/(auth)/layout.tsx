/**
 * app/(auth)/layout.tsx — Auth Shell Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal centered layout for sign-in and sign-up pages.
 * Uses a route group `(auth)` so these pages share a layout without affecting
 * the URL structure.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {/* Brand mark */}
      <div className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">ES</span>
        </div>
        <span className="text-xl font-semibold tracking-tight">EventSync</span>
      </div>
      {children}
    </div>
  );
}
