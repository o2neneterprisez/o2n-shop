const BAG_STORAGE_KEY = "o2n-marketplace-bag";

export type BagItems = Record<string, number>;
const emptyBagItems: BagItems = {};
const subscribers = new Set<() => void>();
let bagItemsSnapshot = emptyBagItems;
let isInitialized = false;

function readStorage(): BagItems {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(BAG_STORAGE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, quantity]) => typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0
      )
    );
  } catch {
    return {};
  }
}

export function readBagItems(): BagItems {
  if (!isInitialized) {
    bagItemsSnapshot = readStorage();
    isInitialized = true;
  }

  return bagItemsSnapshot;
}

export function getServerBagItemsSnapshot() {
  return emptyBagItems;
}

export function subscribeToBagItems(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

function writeBagItems(items: BagItems) {
  bagItemsSnapshot = items;
  isInitialized = true;

  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Keep the in-memory bag usable when browser storage is unavailable.
  }

  subscribers.forEach((subscriber) => subscriber());
}

export function addBagItem(productId: string) {
  const items = readBagItems();
  items[productId] = (items[productId] ?? 0) + 1;
  writeBagItems(items);
}

export function removeBagItem(productId: string) {
  const items = readBagItems();
  if (!items[productId]) return;
  items[productId] -= 1;
  if (items[productId] <= 0) delete items[productId];
  writeBagItems(items);
}
