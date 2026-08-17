"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns true on the client after hydration, and false on the server / during SSR.
 * Uses useSyncExternalStore to avoid hydration mismatch and react-hooks/set-state-in-effect errors.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
