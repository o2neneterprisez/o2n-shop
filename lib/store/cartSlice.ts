import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type BagItems = Record<string, number>;

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: {} as BagItems },
  reducers: {
    addBagItem(state, action: PayloadAction<string>) {
      state.items[action.payload] = (state.items[action.payload] ?? 0) + 1;
    },
    removeBagItem(state, action: PayloadAction<string>) {
      const productId = action.payload;
      const quantity = state.items[productId];
      if (!quantity) return;
      if (quantity <= 1) delete state.items[productId];
      else state.items[productId] = quantity - 1;
    },
  },
});

export const { addBagItem, removeBagItem } = cartSlice.actions;
export default cartSlice.reducer;
