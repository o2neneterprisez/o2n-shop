import type { MarketplaceProduct, MarketplaceShop } from "@/lib/supabase/api";
import { searchMarketplace, type MarketplaceSearchSuggestion } from "@/lib/supabase/api";
import Link from "next/link";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 20c.7-3.3 3.5-5.5 7.5-5.5s6.8 2.2 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
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
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4.5 20c.7-3.3 3.5-5.5 7.5-5.5s6.8 2.2 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </summary>
      <div className="account-menu">
        <strong>{user.displayName ?? "Your account"}</strong>
        {user.email ? <span>{user.email}</span> : null}
        {error ? <p className="account-menu-error" role="alert">{error}</p> : null}
        <button type="button" disabled={isSigningOut} onClick={signOut}>
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </details>
  );
}

export function HeaderSection({
  bagCount,
  search,
  onSearchChange,
}: {
  bagCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<MarketplaceSearchSuggestion[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [resultsQuery, setResultsQuery] = useState("");
  const query = search.trim();
  const showSuggestions = isSearchFocused && query.length >= 2;
  const visibleSuggestions = resultsQuery === query ? suggestions : [];

  useEffect(() => {
    if (query.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchMarketplace(query);
        if (!cancelled) {
          setSuggestions(results);
          setResultsQuery(query);
          setActiveSuggestion(-1);
        }
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
          setResultsQuery(query);
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
  }, [query]);

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
    <MarketplaceHeader>
      <div className="marketplace-search" ref={searchRef}>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            role="combobox"
            aria-label="Search products, shops, and categories"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="marketplace-search-results"
            aria-activedescendant={activeSuggestion >= 0 ? `marketplace-search-result-${activeSuggestion}` : undefined}
            placeholder="Search products, shops, categories…"
            value={search}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(event) => {
            const value = event.target.value;
            onSearchChange(value);
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
          <span id="bagCount" className="cart-count">{bagCount}</span>
        </button>
      </div>
    </MarketplaceHeader>
  );
}

export function NoticeSection() {
  return (
    <div className="notice">
      ✦ <b>LIVE DATABASE PREVIEW</b> &nbsp; Real listings from O2N database · Secure checkout not yet enabled
    </div>
  );
}

export function HeroSection({ onOpenSeller }: { onOpenSeller: () => void }) {
  return (
    <section className="hero">
      <div className="heroBox">
        <div className="heroText">
          <div className="eyebrow">● &nbsp; YOUR NEIGHBOURHOOD, ONLINE</div>
          <h1>
            Good finds.<br />
            <span>Closer to home.</span>
          </h1>
          <p>
            Discover independent shops and online sellers across Jharkhand. Find what you need,
            support local businesses, and shop with confidence.
          </p>
          <div className="heroActions">
            <button type="button" className="btn primary" onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}>
              Explore the mall ↗
            </button>
            <button type="button" className="btn secondary" onClick={onOpenSeller}>
              ＋ Open your shop
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PromoHighlightsSection({ onOpenSeller }: { onOpenSeller: () => void }) {
  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="o2n-promo-area" aria-label="Shop and offers">
      <div className="o2n-promo-grid">
        <button type="button" className="o2n-promo-card o2n-promo-deals" onClick={scrollToProducts}>
          <span className="o2n-promo-kicker">SMART SHOPPING</span>
          <span className="o2n-promo-emoji" aria-hidden="true">🏷️</span>
          <h2>Great finds.<br />Local prices.</h2>
          <p>Explore products and compare prices from approved sellers.</p>
          <span className="o2n-promo-cta">Explore products <b>→</b></span>
        </button>

        <Link className="o2n-promo-card o2n-promo-shops" href="/shops">
          <span className="o2n-promo-kicker">AROUND YOUR NEIGHBOURHOOD</span>
          <span className="o2n-promo-emoji" aria-hidden="true">🏬</span>
          <h2>Your next favourite shop is closer.</h2>
          <p>Discover local businesses and browse their storefronts.</p>
          <span className="o2n-promo-cta">Discover all shops <b>→</b></span>
        </Link>

        <button type="button" className="o2n-promo-card o2n-promo-seller" onClick={onOpenSeller}>
          <span className="o2n-promo-kicker">FOR LOCAL BUSINESSES</span>
          <span className="o2n-promo-emoji" aria-hidden="true">🚀</span>
          <h2>Bring your shop online.</h2>
          <p>Apply to sell on O2N. First 3 months free on seller subscriptions.</p>
          <span className="o2n-promo-cta">List your shop <b>↗</b></span>
        </button>
      </div>

      <div className="o2n-offer-ribbon">
        <span className="o2n-offer-icon" aria-hidden="true">✨</span>
        <div>
          <strong>Discover more. Support local.</strong>
          <small>New finds from approved sellers, all in one place.</small>
        </div>
        <Link href="/categories">Browse categories <b>→</b></Link>
      </div>
    </section>
  );
}

export function CategorySection({
  selectedCategory,
  onSelect,
}: {
  selectedCategory: string;
  onSelect: (value: string) => void;
}) {
  const categories = ["All", "Fashion", "Groceries", "Electronics", "Home", "Beauty"];
  const categoryIcons: Record<string, string> = {
    All: "✦",
    Fashion: "👕",
    Groceries: "🥬",
    Electronics: "🎧",
    Home: "🪴",
    Beauty: "🧴",
    Other: "🛍️",
  };

  return (
    <section className="section" id="discover">
      <div className="head">
        <div>
          <h2>Explore by category</h2>
          <p>Choose a category to narrow your search.</p>
        </div>
        <Link className="link" href="/categories">
          View all ↗
        </Link>
      </div>

      <div className="cats">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`cat ${selectedCategory === category ? "active" : ""}`}
            data-cat={category}
            onClick={() => onSelect(category)}
          >
            <span className="ci">{categoryIcons[category] ?? "✦"}</span>
              <b>{category === "All" ? "Everything" : category === "Home" ? "Home & living" : category}</b>
              <small>{
                ({
                  All: "All categories",
                  Fashion: "Wear your style",
                  Groceries: "Everyday needs",
                  Electronics: "Tech & gadgets",
                  Home: "Make it yours",
                  Beauty: "Care & wellness",
                } as Record<string, string>)[category] ?? "Browse items"
              }</small>
          </button>
        ))}
      </div>
    </section>
  );
}

const categoryAliases: Record<string, string[]> = {
  Fashion: ["fashion", "clothing & fashion", "footwear", "ethnic wear", "kids’ clothing", "men’s clothing", "women’s clothing"],
  Groceries: ["groceries", "grocery", "grocery & food", "food", "dairy & bakery", "fresh produce", "snacks & beverages", "staples & pulses"],
  Electronics: ["electronics", "electronics & mobile", "mobile", "audio & headphones", "computers & laptops", "mobile accessories", "mobile phones"],
  Home: ["home", "home & kitchen", "home & living", "bedding & bath", "furniture", "home decor", "kitchen essentials"],
  Beauty: ["beauty", "beauty & personal care", "personal care", "haircare", "makeup", "personal hygiene", "skincare"],
};

function matchesSearchText(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query) ?? false;
}

function matchesCategorySearch(category: string | undefined, query: string) {
  if (!category) return false;
  const normalizedCategory = category.trim().toLowerCase();
  if (normalizedCategory.includes(query)) return true;

  return Object.values(categoryAliases).some((aliases) =>
    aliases.some((alias) => alias.includes(query) && normalizedCategory.includes(alias))
  );
}

export function ProductSection({
  products,
  onAddToBag,
  onOpenProduct,
  selectedCategory,
  search,
  sort,
  onCategoryChange,
  onSortChange,
  heading,
}: {
  products: MarketplaceProduct[];
  onAddToBag: (productId: string) => void;
  onOpenProduct: (productId: string) => void;
  selectedCategory: string;
  search: string;
  sort: string;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  heading?: string;
}) {
  const visibleProducts = products.filter((product) => {
    const productCategory = product.category?.trim().toLowerCase() ?? "";
    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory ||
      (categoryAliases[selectedCategory]?.includes(productCategory) ?? false);
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      matchesSearchText(product.title, query) ||
      matchesSearchText(product.description, query) ||
      matchesSearchText(product.shopName, query) ||
      matchesCategorySearch(product.category, query);

    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...visibleProducts].sort((a, b) => {
    if (sort === "up") return a.price - b.price;
    if (sort === "down") return b.price - a.price;
    return new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime();
  });

  return (
    <section className="section" id="products">
      <div className="head">
        <div>
          <h2 id="listTitle">
            {heading ?? (search ? "Search results" : selectedCategory === "All" ? "Products from real sellers" : `${selectedCategory} listings`)}
          </h2>
          <p>Only approved listings appear here.</p>
        </div>
      </div>

      <div className="toolbar">
        <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)}>
          {Array.from(new Set(["All", ...products.map((product) => product.category ?? "Other")])).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
          <option value="new">Recently added</option>
          <option value="up">Price: low to high</option>
          <option value="down">Price: high to low</option>
        </select>

        <span className="count">{sortedProducts.length} available products</span>
      </div>

      {!sortedProducts.length ? (
        <div className="empty">
          <div className="ei">⌕</div>
          <h3>{search ? "No matching listings yet" : "No available products yet"}</h3>
          <p>{search ? "Try a different search." : "Approved in-stock products will appear here automatically."}</p>
          <small>Listings appear after approval.</small>
        </div>
      ) : (
        <div className="productgrid">
          {sortedProducts.map((product) => {
            const discount = product.compare_at_price && product.compare_at_price > product.price
              ? Math.round((1 - product.price / product.compare_at_price) * 100)
              : 0;

            return (
              <article key={product.id} className="product">
                <div className="visual open-detail" onClick={() => onOpenProduct(product.id)}>
                  {product.image ? (
                    <img src={product.image} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "👕"
                  )}
                </div>

                <div className="pinfo">
                  <span className="pill">Verified listing</span>
                  <h3 className="open-detail" onClick={() => onOpenProduct(product.id)}>{product.title}</h3>
                  <div className="price">₹{product.price.toLocaleString("en-IN")}</div>
                  {discount > 0 ? (
                    <small style={{ color: "#16834a", fontWeight: 800 }}>
                      {discount}% OFF · <s style={{ color: "#7a8192" }}>₹{Number(product.compare_at_price ?? 0).toLocaleString("en-IN")}</s>
                    </small>
                  ) : null}
                  <small>{product.shopName}</small>
                  <button type="button" className="btn primary addbag" onClick={() => onAddToBag(product.id)}>
                    Add to bag
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ShopSection({ shops }: { shops: MarketplaceShop[] }) {
  const displayedShops = [...shops]
    .sort((left, right) => {
      const leftCreatedAt = Date.parse(left.created_at ?? "");
      const rightCreatedAt = Date.parse(right.created_at ?? "");
      return (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0) -
        (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0);
    })
    .slice(0, 3);

  return (
    <section className="section">
      <div className="head">
        <div>
          <h2>Shops worth discovering</h2>
          <p>Explore approved local sellers and their products.</p>
        </div>
        <Link className="link" href="/shops">
          Discover more shops →
        </Link>
      </div>

      <div className="shop-showcase">
        {displayedShops.length ? (
          displayedShops.map((shop) => {
            const initials = shop.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
            return (
              <Link
                key={shop.id}
                className="shop-showcase-card"
                href={`/shops#shop-${encodeURIComponent(shop.id)}`}
              >
                <span className="shop-showcase-logo">
                  {shop.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shop.logo_url} alt={`${shop.name} logo`} />
                  ) : (
                    initials || "🏬"
                  )}
                </span>
                <span className="shop-showcase-copy">
                  <strong>{shop.name}</strong>
                  <small>{shop.district || shop.state || "Jharkhand"} · Approved shop</small>
                </span>
                <span className="shop-showcase-arrow" aria-hidden="true">↗</span>
              </Link>
            );
          })
        ) : (
          <div className="empty shop-showcase-empty">
            <h3>Shops are joining O2N</h3>
            <p>Approved shops will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section className="section" id="how">
      <div className="head">
        <div>
          <h2>A simpler way to shop</h2>
          <p>Built to help buyers and sellers connect.</p>
        </div>
      </div>

      <div className="how">
        <article className="step">
          <div className="num">01</div>
          <h3>Discover</h3>
          <p>Search approved products and browse shops by category. Listings should show accurate prices and seller details.</p>
        </article>

        <article className="step">
          <div className="num">02</div>
          <h3>Choose your seller</h3>
          <p>Compare available options and check shop information before placing an order.</p>
        </article>

        <article className="step">
          <div className="num">03</div>
          <h3>Order securely</h3>
          <p>Online checkout will be enabled after payment, order management and buyer protection systems are connected.</p>
        </article>
      </div>
    </section>
  );
}

export function SellerCTASection({ onOpenSeller }: { onOpenSeller: () => void }) {
  return (
    <section className="seller" id="seller">
      <div>
        <h2>Have a shop? Get discovered on O2N.</h2>
        <p>
          Physical stores and online sellers are welcome. Apply to list your shop and products for review.
          Get your first 3 months free, then choose a monthly seller plan. Billing will activate after payment services are connected.
        </p>
      </div>
      <button type="button" className="btn primary" onClick={onOpenSeller}>
        Become a seller →
      </button>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="footer">
      <div className="wrap footerin">
        <div>
          <div className="brand">
            <span className="logo">O₂</span>
            <span>
              O2N E-Mall
              <small>SHOP LOCAL. DISCOVER MORE.</small>
            </span>
          </div>
          <p>Built for buyers and businesses across Jharkhand.</p>
        </div>
        <div className="fineprint">
          Preview only · No real products or sellers have been seeded.
          <br />
          Do not submit sensitive information. Payments and secure accounts are not enabled.
        </div>
      </div>

      <div className="admin-access" style={{ padding: "14px 0", borderTop: "1px solid #ffffff35", marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
        
      </div>
    </footer>
  );
}
