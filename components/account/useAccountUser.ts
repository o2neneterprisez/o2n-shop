"use client";

import { useSyncExternalStore } from "react";
import { useAppSelector } from "@/lib/store/hooks";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * The signed-in user for account pages. Sign-in state only exists in the browser,
 * so `ready` stays false during the server render to avoid hydration mismatches.
 */
export function useAccountUser() {
  const isClient = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
  const user = useAppSelector((state) => state.auth.user);
  const initialized = useAppSelector((state) => state.auth.initialized);
  return { user: isClient ? user : null, ready: isClient && initialized };
}
