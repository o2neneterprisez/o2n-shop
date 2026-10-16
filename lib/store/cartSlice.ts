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

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: {} as BagItems },
  reducers: {
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

export const { addBagItem, increaseBagLine, removeBagItem, removeBagProduct } = cartSlice.actions;
export default cartSlice.reducer;
