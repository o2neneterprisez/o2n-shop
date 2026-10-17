"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authUserFromSupabase, setAuthUser } from "@/lib/store/authSlice";
import { parseSavedBag, restoreBag } from "@/lib/store/cartSlice";
import { useAppDispatch, useAppStore } from "@/lib/store/hooks";
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

const BAG_STORAGE_KEY = "o2n-bag";

function readSavedBag() {
  try {
    return parseSavedBag(window.localStorage.getItem(BAG_STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode, site data disabled); start with an empty bag.
    return {};
  }
}

/** Keeps the bag in localStorage so it survives refreshes and stays in step across tabs. */
function BagPersistence() {
  const store = useAppStore();

  useEffect(() => {
    // Restored after hydration so the first render matches the server (empty bag).
    store.dispatch(restoreBag(readSavedBag()));

    let lastSaved = store.getState().cart.items;
    const unsubscribe = store.subscribe(() => {
      const { items, restored } = store.getState().cart;
      if (!restored || items === lastSaved) return;
      lastSaved = items;
      try {
        window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Saving is best-effort; the bag still works for this visit.
      }
    });

    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== BAG_STORAGE_KEY) return;
      const items = parseSavedBag(event.newValue);
      lastSaved = items;
      store.dispatch(restoreBag(items));
    };
    window.addEventListener("storage", syncFromOtherTab);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, [store]);

  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<AppStore>(makeStore);

  return (
    <Provider store={store}>
      <AuthStateSync />
      <BagPersistence />
      {children}
    </Provider>
  );
}
