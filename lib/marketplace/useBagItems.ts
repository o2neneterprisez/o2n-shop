"use client";

import { useSyncExternalStore } from "react";
import { getServerBagItemsSnapshot, readBagItems, subscribeToBagItems } from "./cart";

export function useBagItems() {
  return useSyncExternalStore(subscribeToBagItems, readBagItems, getServerBagItemsSnapshot);
}