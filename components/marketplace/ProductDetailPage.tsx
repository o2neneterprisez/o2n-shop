"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addBagItem } from "@/lib/marketplace/cart";
import { getMarketplaceData, type MarketplaceProduct } from "@/lib/supabase/api";

export function ProductDetailPage({ productId }: { productId: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      const data = await getMarketplaceData();
      if (cancelled) return;

      const foundProduct = data.products.find((item) => item.id === productId) ?? null;
      setProduct(foundProduct);
      setSelectedVariants(
        Object.fromEntries(
          (foundProduct?.variant_options ?? [])
            .filter((variant) => variant.options.length > 0)
            .map((variant) => [variant.name, variant.options[0]])
        )
      );
      setIsLoaded(true);
    };

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsZoomOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const images = product?.gallery?.length
    ? product.gallery
    : product?.image
      ? [product.image]
      : [];
  const image = images[activeImage];
  const discount = product?.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;

  const handleAddToBag = () => {
    if (!product || product.stock_quantity < 1) return;
    addBagItem(product.id);
    router.push("/");
  };

  if (!product) {
    return (
      <main className="productdetail-page">
        <div className="detailbar">
          <Link href="/" className="detail-back" aria-label="Back to products">←</Link>
          <strong>{isLoaded ? "Product unavailable" : "Loading product…"}</strong>
          <span className="detail-brand">O2N E-Mall</span>
        </div>
        {isLoaded ? (
          <div className="detail-empty">
            <h1>Product unavailable</h1>
            <p>This listing may have been removed or is no longer available.</p>
            <Link className="btn primary" href="/">Back to products</Link>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="productdetail-page">
      <div className="detailbar">
        <Link href="/" className="detail-back" aria-label="Back to products">←</Link>
        <strong>{product.title}</strong>
        <Link href="/" className="detail-brand">O2N E-Mall</Link>
      </div>

      <div className="detailwrap">
        <section className="detailpanel" aria-label="Product images">
          {image ? (
            <>
              <img
                className="detailhero"
                src={image}
                alt={product.title}
                onClick={() => setIsZoomOpen(true)}
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  event.currentTarget.dataset.touchX = String(touch.clientX);
                  event.currentTarget.dataset.touchY = String(touch.clientY);
                }}
                onTouchEnd={(event) => {
                  if (images.length < 2) return;
                  const startX = Number(event.currentTarget.dataset.touchX ?? 0);
                  const startY = Number(event.currentTarget.dataset.touchY ?? 0);
                  const touch = event.changedTouches[0];
                  const deltaX = touch.clientX - startX;
                  const deltaY = touch.clientY - startY;
                  if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
                    setActiveImage((index) => (index + (deltaX < 0 ? 1 : -1) + images.length) % images.length);
                  }
                }}
              />
              {images.length > 1 ? (
                <div className="detailthumbs">
                  {images.map((imageUrl, index) => (
                    <button
                      key={`${product.id}-image-${index}`}
                      type="button"
                      className={`detailthumb ${activeImage === index ? "selected" : ""}`}
                      onClick={() => setActiveImage(index)}
                      aria-label={`Show product image ${index + 1}`}
                    >
                      <img src={imageUrl} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="detail-hint">Tap the picture to zoom</p>
            </>
          ) : (
            <div className="detail-no-image">No product image available</div>
          )}
        </section>

        <section className="detailpanel">
          <span className="pill">Verified listing</span>
          <h1 className="detail-name">{product.title}</h1>
          <div className="detailprice">₹{product.price.toLocaleString("en-IN")}</div>
          {discount > 0 ? (
            <div>
              <span className="detailmrp">₹{Number(product.compare_at_price).toLocaleString("en-IN")}</span>
              <span className="detailoff">{discount}% OFF</span>
            </div>
          ) : null}
          <p className="detail-stock">
            {product.stock_quantity > 0 ? `In stock · ${product.stock_quantity} available` : "Currently out of stock"}
          </p>

          {product.variant_options?.map((variant) => (
            variant.options.length ? (
              <div key={variant.name} className="variant-section">
                <b>{variant.name || "Options"}</b>
                <div className="variantrow">
                  {variant.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`variantbtn ${selectedVariants[variant.name] === option ? "selected" : ""}`}
                      onClick={() => setSelectedVariants((current) => ({ ...current, [variant.name]: option }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          ))}

          <div className="detailactions">
            <button type="button" className="btn primary" onClick={handleAddToBag} disabled={product.stock_quantity < 1}>
              Add to bag
            </button>
            <Link href="/" className="btn secondary">Continue shopping</Link>
          </div>

          <div className="detailmeta">
            <h2>Product details</h2>
            <p className="detaildesc">{product.description || "No description provided by the seller."}</p>
            <p><b>Category:</b> {product.category ?? "Other"}</p>
            <p><b>Sold by:</b> {product.shopName ?? "Unknown shop"}</p>
            <p><b>Location:</b> {[product.shopDistrict, product.shopState].filter(Boolean).join(", ") || "Jharkhand"}</p>
            <p><b>Warranty:</b> {product.warranty ?? "Not specified"}</p>
            <p><b>Return policy:</b> {product.return_policy ?? "Check with seller"}</p>
          </div>
        </section>
      </div>

      {isZoomOpen && image ? (
        <button type="button" className="zoomlayer open" onClick={() => setIsZoomOpen(false)} aria-label="Close zoomed image">
          <img src={image} alt={product.title} />
        </button>
      ) : null}
    </main>
  );
}
