"use client";

import { useSyncExternalStore } from "react";
import type { BagItems } from "@/lib/store/cartSlice";
import { useAppSelector } from "@/lib/store/hooks";

const EMPTY_BAG: BagItems = {};
const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * The shopper's bag. The saved bag only exists in the browser, so the server render and
 * hydration always see an empty bag; the saved one appears straight after.
 */
export function useBagItems() {
  const isClient = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
  const items = useAppSelector((state) => state.cart.items);
  return isClient ? items : EMPTY_BAG;
}
