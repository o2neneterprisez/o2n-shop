"use client";

import { useAppSelector } from "@/lib/store/hooks";

export function useBagItems() {
  return useAppSelector((state) => state.cart.items);
}