"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authUserFromSupabase, setAuthUser } from "@/lib/store/authSlice";
import { useAppDispatch } from "@/lib/store/hooks";
import { makeStore, type AppStore } from "@/lib/store/store";

function AuthStateSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      dispatch(setAuthUser(null));
      return;
    }

    let active = true;
    let authEventSeen = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      dispatch(setAuthUser(authUserFromSupabase(session?.user ?? null)));
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventSeen) return;
      if (error) {
        console.error("Unable to restore Supabase auth session.", error.message);
        dispatch(setAuthUser(null));
        return;
      }
      dispatch(setAuthUser(authUserFromSupabase(data.session?.user ?? null)));
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<AppStore>(makeStore);

  return (
    <Provider store={store}>
      <AuthStateSync />
      {children}
    </Provider>
  );
}
