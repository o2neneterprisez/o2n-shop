"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addBagItem } from "@/lib/marketplace/cart";
import { useAppDispatch } from "@/lib/store/hooks";
import type { MarketplaceProduct } from "@/lib/supabase/api";
import { ProductCard } from "./sections";
import styles from "./RelatedProducts.module.css";

const PAGE_SIZE = 8;

export function RelatedProducts({ products, subtitle }: { products: MarketplaceProduct[]; subtitle: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sectionRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goTo(nextPage: number) {
    setPage(nextPage);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!products.length) return null;

  return (
    <section aria-labelledby="related-products-title" className={styles.section} ref={sectionRef}>
      <div className={styles.head}>
        <div>
          <h2 id="related-products-title">You may also like</h2>
          <p>{subtitle}</p>
        </div>
        <span className={styles.count}>{products.length} {products.length === 1 ? "product" : "products"}</span>
      </div>

      <div className="productgrid">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            onAddToBag={(productId) => dispatch(addBagItem({ productId }))}
            onOpenProduct={(productId) => router.push(`/products/${encodeURIComponent(productId)}`)}
            product={product}
          />
        ))}
      </div>

      {pageCount > 1 ? (
        <nav aria-label="Related products pages" className={styles.pagination}>
          <button disabled={currentPage === 1} onClick={() => goTo(currentPage - 1)} type="button">← Previous</button>
          <ol>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <li key={number}>
                <button
                  aria-current={number === currentPage ? "page" : undefined}
                  aria-label={`Page ${number}`}
                  className={number === currentPage ? styles.active : undefined}
                  onClick={() => goTo(number)}
                  type="button"
                >
                  {number}
                </button>
              </li>
            ))}
          </ol>
          <button disabled={currentPage === pageCount} onClick={() => goTo(currentPage + 1)} type="button">Next →</button>
        </nav>
      ) : null}
    </section>
  );
}
