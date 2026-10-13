import type { MarketplaceProduct, MarketplaceShop } from "@/lib/supabase/api";
import Link from "next/link";

export function HeaderSection({
  bagCount,
  search,
  onSearchChange,
  onOpenBag,
  onOpenSeller,
  onAuth,
  isAuthenticated,
}: {
  bagCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenBag: () => void;
  onOpenSeller: () => void;
  onAuth: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <header className="nav">
      <div className="wrap navin">
        <div className="brand">
          <span className="logo">O₂</span>
          <span>
            O2N <span style={{ color: "#6555e8" }}>E-Mall</span>
            <small>SHOP LOCAL. DISCOVER MORE.</small>
          </span>
        </div>

        <label className="search">
          ⌕
          <input
            aria-label="Search products"
            placeholder="Search products, shops, categories…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <div className="actions">
          <button type="button" className="btn secondary" onClick={onAuth}>
            {isAuthenticated ? "Account / sign out" : "Sign in"}
          </button>
          <button type="button" className="btn secondary" onClick={onOpenSeller}>
            Sell on O2N
          </button>
          <button type="button" className="btn primary" onClick={onOpenBag}>
            Bag <span id="bagCount">{bagCount}</span>
          </button>
        </div>
      </div>
    </header>
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

export function CategorySection({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: string[];
  selectedCategory: string;
  onSelect: (value: string) => void;
}) {
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
        <button type="button" className="link" onClick={() => onSelect("All")}>
          View all ↗
        </button>
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

export function ProductSection({
  products,
  onAddToBag,
  onOpenProduct,
  selectedCategory,
  search,
  sort,
  onCategoryChange,
  onSortChange,
}: {
  products: MarketplaceProduct[];
  onAddToBag: (productId: string) => void;
  onOpenProduct: (productId: string) => void;
  selectedCategory: string;
  search: string;
  sort: string;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  const visibleProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      `${product.title} ${product.description ?? ""} ${product.shopName ?? ""} ${product.category ?? ""}`
        .toLowerCase()
        .includes(query);

    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...visibleProducts].sort((a, b) => {
    if (sort === "up") return a.price - b.price;
    if (sort === "down") return b.price - a.price;
    return new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime();
  });

  return (
    <section className="section">
      <div className="head">
        <div>
          <h2 id="listTitle">
            {search ? "Search results" : selectedCategory === "All" ? "Products from real sellers" : `${selectedCategory} listings`}
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
                  <p>{product.description}</p>
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

export function ShopSection({ shops, onOpenSeller }: { shops: MarketplaceShop[]; onOpenSeller: () => void }) {
  return (
    <section className="section">
      <div className="head">
        <div>
          <h2>Shops worth discovering</h2>
          <p>Explore approved local sellers and their products.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="link" href="/shops" style={{ textDecoration: "none", fontWeight: 800 }}>
            Discover all shops →
          </Link>
          <button type="button" className="link" onClick={onOpenSeller}>
            List your shop ↗
          </button>
        </div>
      </div>

      <div className="shops">
        {shops.length ? (
          shops.map((shop) => (
            <article key={shop.id} className="shop">
              <span className="emoji">🏬</span>
              <h3>{shop.name}</h3>
              <p>{shop.district || shop.state || "Jharkhand"} · Approved shop</p>
            </article>
          ))
        ) : (
          <div className="empty">
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
        <a href="https://o2n-enterprises-exaju15ds-o2n.vercel.app/admin.html" style={{ color: "#e6e3ff", fontWeight: 800, textDecoration: "underline" }}>
          Administrator Login
        </a>
        <a href="https://o2n-enterprises-6fd4jesfj-o2n.vercel.app/super-admin.html" style={{ color: "#ffd69d", fontWeight: 800, textDecoration: "underline" }}>
          Super Admin Control Centre
        </a>
      </div>
    </footer>
  );
}
