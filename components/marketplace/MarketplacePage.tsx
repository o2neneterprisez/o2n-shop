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

  useEffect(() => {
    const loadData = async () => {
      const data = await getMarketplaceData();
      setProducts(data.products);
      setShops(data.shops);
    };

    loadData();
  }, []);

  const addToBag = (productId: string) => {
    dispatch(addBagItem({ productId }));
  };
  const openSellerApplication = () => router.push("/seller-application");

  return (
    <>
      <NoticeSection />
      <MarketplaceHeader showSearch />

      <main className="page-shell">
        <HeroSection onOpenSeller={openSellerApplication} />

        <PromoHighlightsSection onOpenSeller={openSellerApplication} />

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
        <SellerCTASection onOpenSeller={openSellerApplication} />
      </main>

      <FooterSection />
    </>
  );
}
