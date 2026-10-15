"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addBagItem, removeBagItem, removeBagProduct } from "@/lib/marketplace/cart";
import { useBagItems } from "@/lib/marketplace/useBagItems";
import { useAppDispatch } from "@/lib/store/hooks";
import { getMarketplaceData, type MarketplaceProduct } from "@/lib/supabase/api";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export function CartPage() {
  const dispatch = useAppDispatch();
  const bagItems = useBagItems();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMarketplaceData()
      .then((data) => {
        if (!cancelled) setProducts(data.products);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your bag.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bagProducts = useMemo(
    () => Object.entries(bagItems).map(([id, quantity]) => ({
      id,
      quantity,
      product: products.find((product) => product.id === id) ?? null,
    })),
    [bagItems, products],
  );
  const itemCount = bagProducts.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = bagProducts.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);

  return (
    <div className="cart-page">
      <MarketplaceHeader />
      <main className="cart-main">
        <div className="cart-page-heading">
          <div>
            <span className="category-pill">YOUR SELECTION</span>
            <h1>Your bag</h1>
            <p>{itemCount} {itemCount === 1 ? "item" : "items"} in your bag</p>
          </div>
          <Link className="btn secondary" href="/">Continue shopping</Link>
        </div>

        {error ? <div className="cart-alert" role="alert">{error}</div> : null}
        {loading ? <div className="cart-empty" aria-busy="true">Loading your bag…</div> : null}
        {!loading && !error && !bagProducts.length ? (
          <section className="cart-empty">
            <span aria-hidden="true" className="cart-empty-icon">🛍️</span>
            <h2>Your bag is empty</h2>
            <p>Explore local shops and add something you love.</p>
            <Link className="btn primary" href="/">Explore products</Link>
          </section>
        ) : null}

        {!loading && !error && bagProducts.length ? (
          <div className="cart-layout">
            <section aria-label="Items in your bag" className="cart-items">
              {bagProducts.map(({ id, product, quantity }) => (
                <article className="cart-line" key={id}>
                  <div className="cart-line-image">
                    {product?.image
                      ? <Link aria-label={`View ${product.title}`} href={`/products/${encodeURIComponent(id)}`}><Image alt={product.title} height={128} src={product.image} unoptimized width={128} /></Link>
                      : <span aria-hidden="true">🛍️</span>}
                  </div>
                  <div className="cart-line-details">
                    <div className="cart-line-copy">
                      <h2>{product?.title ?? "Product unavailable"}</h2>
                      <p>{product ? product.shopName ?? "O2N E-Mall" : "This listing is no longer available."}</p>
                      {product ? <strong>₹{product.price.toLocaleString("en-IN")}</strong> : null}
                    </div>
                    <div className="cart-line-controls">
                      {product ? (
                        <div aria-label={`Quantity for ${product.title}`} className="cart-quantity">
                          <button aria-label={`Decrease quantity of ${product.title}`} onClick={() => dispatch(removeBagItem(id))} type="button">−</button>
                          <span>{quantity}</span>
                          <button
                            aria-label={`Increase quantity of ${product.title}`}
                            disabled={quantity >= product.stock_quantity}
                            onClick={() => dispatch(addBagItem(id))}
                            type="button"
                          >+</button>
                        </div>
                      ) : <span className="cart-unavailable">Unavailable</span>}
                      <button className="cart-remove" onClick={() => dispatch(removeBagProduct(id))} type="button">Remove</button>
                    </div>
                  </div>
                  {product ? <strong className="cart-line-total">₹{(product.price * quantity).toLocaleString("en-IN")}</strong> : null}
                </article>
              ))}
            </section>
            <aside aria-label="Order summary" className="cart-summary">
              <h2>Order summary</h2>
              <div><span>Items</span><span>{itemCount}</span></div>
              <div><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div>
              <p>Delivery and payment details will be available at checkout.</p>
              <button className="btn primary" disabled type="button">Checkout coming soon</button>
            </aside>
          </div>
        ) : null}
      </main>
      <footer className="category-foot">O2N E-Mall · Discover more. Support local.</footer>
    </div>
  );
}
