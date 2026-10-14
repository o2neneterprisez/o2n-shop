"use client";

import Link from "next/link";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { useEffect, useMemo, useState } from "react";
import { getShopDirectoryData, type MarketplaceProduct, type MarketplaceShop } from "@/lib/supabase/api";

type ViewMode = "grid" | "list";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatProductCount(count: number) {
  return `${count} product${count === 1 ? "" : "s"}`;
}

export function ShopsPage() {
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [sort, setSort] = useState("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getShopDirectoryData();
        if (cancelled) return;
        setShops(data.shops);
        setProducts(data.products);
        setLoadError(null);

        const hash = window.location.hash;
        if (hash.startsWith("#shop-")) {
          const shopId = decodeURIComponent(hash.slice(6));
          if (data.shops.some((shop) => shop.id === shopId)) setSelectedShopId(shopId);
        }
      } catch (error) {
        if (cancelled) return;
        setShops([]);
        setProducts([]);
        setLoadError(error instanceof Error ? error.message : "An unexpected error occurred while loading shops.");
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    const syncShopFromHistory = () => {
      const hash = window.location.hash;
      setSelectedShopId(hash.startsWith("#shop-") ? decodeURIComponent(hash.slice(6)) : null);
    };

    window.addEventListener("popstate", syncShopFromHistory);
    return () => window.removeEventListener("popstate", syncShopFromHistory);
  }, []);

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.shop_id, (counts.get(product.shop_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const districts = useMemo(
    () => Array.from(new Set(shops.map((shop) => shop.district).filter((value): value is string => Boolean(value)))).sort(),
    [shops]
  );

  const visibleShops = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = shops.filter((shop) => {
      const matchesDistrict = !district || shop.district === district;
      const shopProducts = products.filter((product) => product.shop_id === shop.id);
      const matchesSearch =
        !query ||
        [shop.name, shop.description, shop.district, shop.state, ...shopProducts.map((product) => product.title)]
          .some((value) => value?.toLowerCase().includes(query));
      return matchesDistrict && matchesSearch;
    });

    return rows.sort((left, right) => {
      if (sort === "new") return Date.parse(right.created_at ?? "") - Date.parse(left.created_at ?? "");
      if (sort === "products") return (productCounts.get(right.id) ?? 0) - (productCounts.get(left.id) ?? 0);
      return left.name.localeCompare(right.name);
    });
  }, [district, productCounts, products, search, shops, sort]);

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;
  const selectedProducts = selectedShop ? products.filter((product) => product.shop_id === selectedShop.id) : [];

  const openShop = (shop: MarketplaceShop) => {
    setSelectedShopId(shop.id);
    window.history.pushState({ shop: shop.id }, "", `#shop-${encodeURIComponent(shop.id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeShop = () => {
    setSelectedShopId(null);
    window.history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
  };

  const getShopUrl = (shop: MarketplaceShop) =>
    `${window.location.origin}/shops#shop-${encodeURIComponent(shop.id)}`;

  const shareShop = async (shop: MarketplaceShop) => {
    const url = getShopUrl(shop);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${shop.name} | O2N E-Mall`, text: `Explore ${shop.name} on O2N E-Mall`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Sharing can be dismissed by the user.
    }
  };

  const copyShopUrl = async (shop: MarketplaceShop) => {
    const url = getShopUrl(shop);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this shop link", url);
    }
  };

  return (
    <div className="shops-page">
      <MarketplaceHeader />

      <main className="shops-main">
        <section className="shops-hero">
          <small>Your neighbourhood marketplace</small>
          <h1>Discover shops.<br />Find something you love.</h1>
          <p>Explore approved local sellers, browse their products and discover more from businesses around you.</p>
        </section>

        {!selectedShop ? (
          <>
            <div className="shops-tools">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shops, products or location…"
                aria-label="Search shops"
              />
              <select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="Filter by location">
                <option value="">All locations</option>
                {districts.map((place) => <option key={place} value={place}>{place}</option>)}
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort shops">
                <option value="name">Shop name A–Z</option>
                <option value="new">Recently added</option>
                <option value="products">Most products</option>
              </select>
            </div>

            <div className="shops-summary">
              <h2>Shops worth discovering</h2>
              <span className="shops-muted">
                {isLoaded ? `${visibleShops.length} approved shop${visibleShops.length === 1 ? "" : "s"}` : "Loading shops…"}
              </span>
            </div>

            <div className="shops-view-controls">
              <span>Choose shop layout</span>
              <button type="button" className="shop-view-btn" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>
                ☷ List
              </button>
              <button type="button" className="shop-view-btn" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}>
                ▦ Grid
              </button>
            </div>

            <div className={`shops-grid ${viewMode === "grid" ? "is-grid" : "is-list"}`}>
              {visibleShops.length ? visibleShops.map((shop) => (
                <article className="shop-card" key={shop.id}>
                  <div className="shop-cover">
                    <div className="shop-avatar">
                      {shop.logo_url ? <img src={shop.logo_url} alt={`${shop.name} logo`} /> : getInitials(shop.name)}
                    </div>
                  </div>
                  <div className="shop-body">
                    <h3>{shop.name}</h3>
                    <div className="shop-place">⌖ { [shop.district, shop.state].filter(Boolean).join(", ") || "Location not provided"}</div>
                    <p className="shop-desc">{shop.description || "Discover products from this local seller."}</p>
                    <div className="shop-meta">
                      <span className="shop-chip">✓ Approved seller</span>
                      <span className="shops-muted">{formatProductCount(productCounts.get(shop.id) ?? 0)}</span>
                    </div>
                    <button type="button" className="shop-btn shop-btn-primary" onClick={() => openShop(shop)}>Visit shop →</button>
                  </div>
                </article>
              )) : (
                <div className="shops-empty">
                  <h3>{loadError ? "Shop list could not load" : isLoaded ? "No shops found yet" : "Connecting to O2N Mall…"}</h3>
                  <p className="shops-muted">{loadError ?? (isLoaded ? "Try another search or location. Approved database shops will appear here." : "Loading approved shops from the database.")}</p>
                  {loadError ? (
                    <button
                      className="shop-btn shop-btn-primary"
                      type="button"
                      onClick={() => {
                        setIsLoaded(false);
                        setLoadAttempt((attempt) => attempt + 1);
                      }}
                    >
                      Try again
                    </button>
                  ) : isLoaded ? <Link className="shop-btn" href="/#seller">List your shop</Link> : null}
                </div>
              )}
            </div>
          </>
        ) : (
          <section className="shop-store">
            <button className="shop-btn" type="button" onClick={closeShop}>← All shops</button>
            <div className="shop-storehead">
              <div className="shop-storelogo">
                {selectedShop.logo_url ? <img src={selectedShop.logo_url} alt={`${selectedShop.name} logo`} /> : getInitials(selectedShop.name)}
              </div>
              <div className="shop-storeinfo">
                <h2>{selectedShop.name}</h2>
                <div className="shops-muted">{[selectedShop.district, selectedShop.state].filter(Boolean).join(", ") || "Location not provided"}</div>
                <p className="shops-muted">{selectedShop.description || "Shop local with O2N E-Mall."}</p>
                <div className="shop-share-actions">
                  <button className="shop-btn shop-btn-primary" type="button" onClick={() => shareShop(selectedShop)}>Share shop ↗</button>
                  <button className="shop-btn" type="button" onClick={() => copyShopUrl(selectedShop)}>Copy shop link</button>
                </div>
                <div className="shop-qr-wrap">
                  <div className="shop-qr">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getShopUrl(selectedShop))}`}
                      alt={`QR code for ${selectedShop.name}`}
                    />
                  </div>
                  <span className="shops-muted">Scan to open this shop, or share its link with anyone.</span>
                </div>
              </div>
            </div>

            <div className="shops-summary">
              <h2>Products from this shop</h2>
              <span className="shops-muted">{formatProductCount(selectedProducts.length)}</span>
            </div>
            {selectedProducts.length ? (
              <div className="shop-products">
                {selectedProducts.map((product) => (
                  <Link className="shop-product" href={`/products/${encodeURIComponent(product.id)}`} key={product.id}>
                    {product.image ? <img src={product.image} alt={product.title} /> : <div className="shop-product-placeholder">🛍️</div>}
                    <div className="shop-product-info">
                      <h3>{product.title}</h3>
                      <div className="shop-product-price">
                        ₹{product.price.toLocaleString("en-IN")}
                        {product.compare_at_price && product.compare_at_price > product.price ? (
                          <span>₹{product.compare_at_price.toLocaleString("en-IN")}</span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="shops-empty">
                <h3>No products listed yet</h3>
                <p className="shops-muted">This shop has no currently available products.</p>
              </div>
            )}
          </section>
        )}

        <footer className="shops-footer">O2N E-Mall · Shop local. Discover more.</footer>
      </main>
    </div>
  );
}
