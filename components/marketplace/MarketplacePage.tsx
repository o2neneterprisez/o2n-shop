"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addBagItem } from "@/lib/marketplace/cart";
import { useAppDispatch } from "@/lib/store/hooks";
import { getMarketplaceData, type MarketplaceProduct, type MarketplaceShop } from "@/lib/supabase/api";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import {
  CategorySection,
  FooterSection,
  HeroSection,
  HowItWorksSection,
  NoticeSection,
  PromoHighlightsSection,
  ProductSection,
  SellerCTASection,
  ShopSection,
} from "@/components/marketplace/sections";

export function MarketplacePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sort, setSort] = useState("new");
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await getMarketplaceData();
      setProducts(data.products);
      setShops(data.shops);
    };

    loadData();
  }, []);

  const addToBag = (productId: string) => {
    dispatch(addBagItem(productId));
  };

  return (
    <>
      <NoticeSection />
      <MarketplaceHeader showSearch />

      <main className="page-shell">
        <HeroSection onOpenSeller={() => setIsSellerModalOpen(true)} />

        <PromoHighlightsSection onOpenSeller={() => setIsSellerModalOpen(true)} />

        <CategorySection
          selectedCategory={selectedCategory}
          onSelect={(value) => setSelectedCategory(value)}
        />

        <ProductSection
          products={products}
          selectedCategory={selectedCategory}
          search=""
          sort={sort}
          onCategoryChange={setSelectedCategory}
          onSortChange={setSort}
          onOpenProduct={(productId) => router.push(`/products/${encodeURIComponent(productId)}`)}
          onAddToBag={addToBag}
        />

        <ShopSection shops={shops} />
        <HowItWorksSection />
        <SellerCTASection onOpenSeller={() => setIsSellerModalOpen(true)} />
      </main>

      <FooterSection />

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
