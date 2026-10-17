import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type BagLine = {
  productId: string;
  /** The chosen product variant, or null for products sold without variants. */
  variantId: string | null;
  /** The options the shopper picked, kept so the bag can show them. */
  options: Record<string, string>;
  quantity: number;
};

/** Bag lines keyed by product + variant, so each variant is its own line. */
export type BagItems = Record<string, BagLine>;

export type BagSelection = {
  productId: string;
  variantId?: string | null;
  options?: Record<string, string>;
};

export function bagLineKey({ productId, variantId, options }: BagSelection) {
  if (variantId) return `${productId}::${variantId}`;
  const optionEntries = Object.entries(options ?? {}).sort(([left], [right]) => left.localeCompare(right));
  return optionEntries.length
    ? `${productId}::${optionEntries.map(([name, value]) => `${name}=${value}`).join("|")}`
    : productId;
}

function isOptions(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every((option) => typeof option === "string");
}

/** Reads a saved bag, dropping anything malformed. Older saves stored `{ productId: quantity }`. */
export function parseSavedBag(raw: string | null): BagItems {
  if (!raw) return {};
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};

  const items: BagItems = {};
  for (const [key, value] of Object.entries(saved as Record<string, unknown>)) {
    if (typeof value === "number") {
      if (Number.isInteger(value) && value > 0) items[key] = { productId: key, variantId: null, options: {}, quantity: value };
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const line = value as Partial<BagLine>;
    if (typeof line.productId !== "string" || !Number.isInteger(line.quantity) || (line.quantity ?? 0) < 1) continue;
    const variantId = typeof line.variantId === "string" ? line.variantId : null;
    const options = isOptions(line.options) ? line.options : {};
    items[bagLineKey({ productId: line.productId, variantId, options })] = {
      productId: line.productId,
      variantId,
      options,
      quantity: Math.min(line.quantity as number, 100),
    };
  }
  return items;
}

const cartSlice = createSlice({
  name: "cart",
  // `restored` stays false until the saved bag has been read in the browser.
  initialState: { items: {} as BagItems, restored: false },
  reducers: {
    restoreBag(state, action: PayloadAction<BagItems>) {
      state.items = action.payload;
      state.restored = true;
    },
    addBagItem(state, action: PayloadAction<BagSelection>) {
      const key = bagLineKey(action.payload);
      const line = state.items[key];
      if (line) {
        line.quantity += 1;
        return;
      }
      state.items[key] = {
        productId: action.payload.productId,
        variantId: action.payload.variantId ?? null,
        options: action.payload.options ?? {},
        quantity: 1,
      };
    },
    increaseBagLine(state, action: PayloadAction<string>) {
      const line = state.items[action.payload];
      if (line) line.quantity += 1;
    },
    removeBagItem(state, action: PayloadAction<string>) {
      const line = state.items[action.payload];
      if (!line) return;
      if (line.quantity <= 1) delete state.items[action.payload];
      else line.quantity -= 1;
    },
    removeBagProduct(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
    },
  },
});

export const { addBagItem, increaseBagLine, removeBagItem, removeBagProduct, restoreBag } = cartSlice.actions;
export default cartSlice.reducer;
