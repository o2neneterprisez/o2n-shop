"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { searchMarketplace, type MarketplaceSearchSuggestion } from "@/lib/supabase/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { setAuthUser } from "@/lib/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function AccountControl() {
  const isClient = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
  const user = useAppSelector((state) => state.auth.user);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const dispatch = useAppDispatch();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isClient || !initialized) {
    return (
      <span className="account-avatar" aria-label="Loading account">
        <UserIcon />
      </span>
    );
  }

  if (!user) {
    return <Link className="btn secondary" href="/auth/login">Sign in</Link>;
  }

  const signOut = async () => {
    if (!supabase || !isSupabaseConfigured) return;

    setIsSigningOut(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Could not sign out. Please try again.");
    } else {
      dispatch(setAuthUser(null));
    }
    setIsSigningOut(false);
  };

  return (
    <details className="account-control">
      <summary className="account-avatar" aria-label={`Account: ${user.displayName ?? user.email ?? "User"}`}>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" />
        ) : (
          <UserIcon />
        )}
      </summary>
      <div className="account-menu">
        <strong>{user.displayName ?? "Your account"}</strong>
        {user.email ? <span>{user.email}</span> : null}
        {error ? <p className="account-menu-error" role="alert">{error}</p> : null}
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => {
            void signOut();
          }}
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </details>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 20c.7-3.3 3.5-5.5 7.5-5.5s6.8 2.2 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MarketplaceSearch() {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MarketplaceSearchSuggestion[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [resultsQuery, setResultsQuery] = useState("");
  const normalizedQuery = query.trim();
  const showSuggestions = isSearchFocused && normalizedQuery.length >= 2;
  const visibleSuggestions = resultsQuery === normalizedQuery ? suggestions : [];

  useEffect(() => {
    if (normalizedQuery.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchMarketplace(normalizedQuery);
        if (!cancelled) {
          setSuggestions(results);
          setResultsQuery(normalizedQuery);
          setActiveSuggestion(-1);
        }
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
          setResultsQuery(normalizedQuery);
          setSearchError(error instanceof Error ? error.message : "Search could not be completed.");
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    const closeWhenOutside = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSearchFocused(false);
        setActiveSuggestion(-1);
      }
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, []);

  const selectSuggestion = (suggestion: MarketplaceSearchSuggestion) => {
    setIsSearchFocused(false);
    router.push(suggestion.href);
  };

  return (
    <div className="marketplace-search" ref={searchRef}>
      <label className="search">
        <svg className="search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="2" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          role="combobox"
          aria-label="Search products, shops, and categories"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="marketplace-search-results"
          aria-activedescendant={activeSuggestion >= 0 ? `marketplace-search-result-${activeSuggestion}` : undefined}
          placeholder="Search products, shops, categories…"
          value={query}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setIsSearchFocused(true);
            setSuggestions([]);
            setResultsQuery("");
            setSearchError(null);
            setIsSearching(value.trim().length >= 2);
            setActiveSuggestion(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsSearchFocused(false);
              setActiveSuggestion(-1);
            } else if (event.key === "ArrowDown" && visibleSuggestions.length) {
              event.preventDefault();
              setActiveSuggestion((current) => (current + 1) % visibleSuggestions.length);
            } else if (event.key === "ArrowUp" && visibleSuggestions.length) {
              event.preventDefault();
              setActiveSuggestion((current) => (current <= 0 ? visibleSuggestions.length - 1 : current - 1));
            } else if (event.key === "Enter" && visibleSuggestions.length) {
              event.preventDefault();
              selectSuggestion(visibleSuggestions[activeSuggestion] ?? visibleSuggestions[0]);
            }
          }}
        />
      </label>

      {showSuggestions ? (
        <div className="marketplace-search-dropdown">
          {isSearching ? <p className="marketplace-search-state">Searching…</p> : null}
          {!isSearching && searchError ? <p className="marketplace-search-state error">{searchError}</p> : null}
          {!isSearching && !searchError && visibleSuggestions.length === 0 ? (
            <p className="marketplace-search-state">No matching products, shops, or categories.</p>
          ) : null}
          {!isSearching && visibleSuggestions.length ? (
            <ul id="marketplace-search-results" className="marketplace-search-results" role="listbox" aria-label="Search suggestions">
              {visibleSuggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.id}`} role="option" aria-selected={activeSuggestion === index}>
                  <Link
                    id={`marketplace-search-result-${index}`}
                    href={suggestion.href}
                    className={`marketplace-search-result ${activeSuggestion === index ? "active" : ""}`}
                    onClick={() => setIsSearchFocused(false)}
                  >
                    {suggestion.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={suggestion.imageUrl} alt="" />
                    ) : (
                      <span className={`marketplace-search-result-icon ${suggestion.type}`}>
                        {suggestion.type === "shop" ? "🏬" : suggestion.type === "category" ? "▦" : "🛍️"}
                      </span>
                    )}
                    <span className="marketplace-search-result-copy">
                      <span className="marketplace-search-result-title">{suggestion.title}</span>
                      <span className="marketplace-search-result-subtitle">
                        {suggestion.type === "product" ? "in " : ""}
                        {suggestion.subtitle}
                      </span>
                    </span>
                    <span className="marketplace-search-result-type">{suggestion.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MarketplaceHeader({
  children,
  showSearch = false,
}: {
  children?: ReactNode;
  showSearch?: boolean;
}) {
  const router = useRouter();
  const bagItems = useAppSelector((state) => state.cart.items);
  const bagCount = Object.values(bagItems).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <header className="nav">
      <div className="wrap navin">
        <Link className="brand marketplace-brand" href="/" aria-label="O2N E-Mall home">
          <Image
            className="marketplace-logo"
            src="/o2n-logo.svg"
            alt="O2N E-Mall logo"
            width={48}
            height={48}
            priority
          />
          <span>
            O2N <span className="marketplace-brand-accent">E-Mall</span>
            <small>SHOP LOCAL. DISCOVER MORE.</small>
          </span>
        </Link>

        {children ? <div className="marketplace-header-extra">{children}</div> : null}
        {showSearch ? <MarketplaceSearch /> : null}

        <div className="actions">
          <AccountControl />
          <button
            type="button"
            className="btn primary cart-button"
            onClick={() => router.push("/cart")}
            aria-label={`Open cart, ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1.5" fill="currentColor" />
              <circle cx="18" cy="20" r="1.5" fill="currentColor" />
            </svg>
            <span className="cart-count">{bagCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
