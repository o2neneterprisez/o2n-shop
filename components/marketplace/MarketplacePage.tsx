"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addBagItem, removeBagItem } from "@/lib/marketplace/cart";
import { useBagItems } from "@/lib/marketplace/useBagItems";
import { getMarketplaceData, type MarketplaceProduct, type MarketplaceShop } from "@/lib/supabase/api";
import {
  CategorySection,
  FooterSection,
  HeaderSection,
  HeroSection,
  HowItWorksSection,
  NoticeSection,
  ProductSection,
  SellerCTASection,
  ShopSection,
} from "@/components/marketplace/sections";

export function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");
  const bagItems = useBagItems();
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await getMarketplaceData();
      setProducts(data.products);
      setShops(data.shops);
      setCategories(Array.isArray(data.categories) ? (data.categories as string[]) : ["All"]);
    };

    loadData();
  }, []);

  const bagCount = useMemo(() => Object.values(bagItems).reduce((sum, quantity) => sum + quantity, 0), [bagItems]);

  const bagProducts = useMemo(
    () =>
      Object.entries(bagItems)
        .map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter(Boolean) as Array<{ product: MarketplaceProduct; quantity: number }>,
    [bagItems, products]
  );

  const bagTotal = bagProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToBag = (productId: string) => {
    addBagItem(productId);
    setIsBagOpen(true);
  };

  const removeFromBag = (productId: string) => {
    removeBagItem(productId);
  };

  return (
    <>
      <NoticeSection />
      <HeaderSection
        bagCount={bagCount}
        search={search}
        onSearchChange={setSearch}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenSeller={() => setIsSellerModalOpen(true)}
        onAuth={() => setIsAuthenticated((value) => !value)}
        isAuthenticated={isAuthenticated}
      />

      <main className="page-shell">
        <HeroSection onOpenSeller={() => setIsSellerModalOpen(true)} />

        <CategorySection
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={(value) => setSelectedCategory(value)}
        />

        <ProductSection
          products={products}
          selectedCategory={selectedCategory}
          search={search}
          sort={sort}
          onCategoryChange={setSelectedCategory}
          onSortChange={setSort}
          onOpenProduct={(productId) => router.push(`/products/${encodeURIComponent(productId)}`)}
          onAddToBag={addToBag}
        />

        <ShopSection shops={shops.slice(0, 4)} onOpenSeller={() => setIsSellerModalOpen(true)} />
        <HowItWorksSection />
        <SellerCTASection onOpenSeller={() => setIsSellerModalOpen(true)} />
      </main>

      <FooterSection />

      {isBagOpen && (
        <div className="modal-backdrop open" onClick={() => setIsBagOpen(false)}>
          <div className="cart-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="pill">Your bag</span>
                <h3>{bagCount} items selected</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setIsBagOpen(false)}>
                ×
              </button>
            </div>

            <div className="cart-list">
              {bagProducts.length ? (
                bagProducts.map(({ product, quantity }) => (
                  <div key={product.id} className="cart-item">
                    <img src={product.image ?? "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80"} alt={product.title} />
                    <div>
                      <h4>{product.title}</h4>
                      <p>
                        {product.shopName} · ₹{product.price.toLocaleString("en-IN")}
                      </p>
                      <div className="quantity-control">
                        <button type="button" onClick={() => removeFromBag(product.id)}>-</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => addToBag(product.id)}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty compact">
                  <h3>Your bag is empty</h3>
                  <p>Add a product to start shopping.</p>
                </div>
              )}
            </div>

            <div className="checkout-box">
              <div>
                <span>Subtotal</span>
                <strong>₹{bagTotal.toLocaleString("en-IN")}</strong>
              </div>
              <button type="button" className="btn primary">
                Continue to checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {isSellerModalOpen && (
        <div className="modal-backdrop open" onClick={() => setIsSellerModalOpen(false)}>
          <div className="seller-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="pill">Seller onboarding</span>
                <h3>Apply to sell on O2N</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setIsSellerModalOpen(false)}>
                ×
              </button>
            </div>

            <form className="seller-form">
              <label>
                Shop name
                <input type="text" placeholder="Your business name" />
              </label>
              <label>
                Business email
                <input type="email" placeholder="seller@yourbusiness.com" />
              </label>
              <label>
                District / city
                <input type="text" placeholder="Ranchi" />
              </label>
              <label>
                Tell us what you will sell
                <textarea rows={4} placeholder="Example: electronics, groceries, lifestyle goods..." />
              </label>
              <button type="button" className="btn primary" onClick={() => setIsSellerModalOpen(false)}>
                Submit application
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
