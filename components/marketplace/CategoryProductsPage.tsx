"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { addBagItem } from "@/lib/marketplace/cart";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  getMarketplaceCategories,
  getMarketplaceData,
  type MarketplaceCategory,
  type MarketplaceProduct,
} from "@/lib/supabase/api";
import { ProductSection } from "@/components/marketplace/sections";

export function CategoryProductsPage({ slug }: { slug: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [category, setCategory] = useState<MarketplaceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState("new");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [categoryRows, marketplace] = await Promise.all([
          getMarketplaceCategories(),
          getMarketplaceData(),
        ]);
        if (cancelled) return;

        setCategories(categoryRows);
        setProducts(marketplace.products);
        const selected = slug.toLowerCase() === "all"
          ? null
          : categoryRows.find((item) => item.slug.toLowerCase() === slug.toLowerCase()) ?? null;
        setCategory(selected);
        if (slug.toLowerCase() !== "all" && !selected) {
          setError("That category could not be found.");
        } else {
          setError(null);
        }
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Products could not load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const visibleProducts = useMemo(() => {
    if (!category) return products;

    const categoryIds = new Set([category.id]);
    const pending = [category.id];
    while (pending.length) {
      const parentId = pending.pop();
      for (const child of categories) {
        if (child.parent_id === parentId && !categoryIds.has(child.id)) {
          categoryIds.add(child.id);
          pending.push(child.id);
        }
      }
    }

    return products.filter(
      (product) =>
        (product.category_id && categoryIds.has(product.category_id)) ||
        (!product.category_id && product.category?.toLowerCase() === category.name.toLowerCase())
    );
  }, [categories, category, products]);

  return (
    <div className="category-page">
      <MarketplaceHeader />
      <main className="page-shell category-products-main">
        <section className="category-products-intro">
          <span className="category-pill">DISCOVER LOCAL FINDS</span>
          <h1>{slug.toLowerCase() === "all" ? "Everything" : category?.name ?? "Category"}</h1>
          <p>
            {category?.description || "Explore approved products from local shops."}
          </p>
          <Link className="category-browse-link" href="/categories">
            Browse other categories →
          </Link>
        </section>

        {loading ? <div className="empty" aria-busy="true">Loading products…</div> : null}
        {!loading && error ? (
          <div className="empty" role="alert">
            <h3>We couldn’t show this collection</h3>
            <p>{error}</p>
            <Link className="category-browse-link" href="/categories">
              Return to categories
            </Link>
          </div>
        ) : null}
        {!loading && !error ? (
          <ProductSection
            products={visibleProducts}
            selectedCategory="All"
            search=""
            sort={sort}
            onCategoryChange={() => {}}
            onSortChange={setSort}
            onOpenProduct={(productId) => router.push(`/products/${encodeURIComponent(productId)}`)}
            onAddToBag={(productId) => dispatch(addBagItem({ productId }))}
            heading={`${category?.name ?? "All"} products`}
          />
        ) : null}
      </main>
      <footer className="category-foot">O2N E-Mall · Discover more. Support local.</footer>
    </div>
  );
}
