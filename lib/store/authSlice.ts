import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export function authUserFromSupabase(user: User | null): AuthUser | null {
  if (!user) return null;

  const metadata = user.user_metadata;
  const displayName = metadata.display_name ?? metadata.full_name ?? metadata.name;
  const avatarUrl = metadata.avatar_url ?? metadata.picture;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: typeof displayName === "string" ? displayName : null,
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
  };
}

type AuthState = {
  user: AuthUser | null;
  initialized: boolean;
};

const initialState: AuthState = {
  user: null,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.initialized = true;
    },
  },
});

export const { setAuthUser } = authSlice.actions;
export default authSlice.reducer;
