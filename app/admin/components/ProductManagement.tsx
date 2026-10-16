"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Product } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, formatMoney, Icon, StatusBadge, StatusSelect, Thumbnail } from "./AdminUI";
import { ProductForm } from "./ProductForm";
import { useAdminPermission } from "./useAdminPermission";

const PRODUCT_STATUSES = ["pending", "active", "rejected", "archived"];

export function ProductManagement() {
  const { search } = useAdminContext();
  const { allowed, error: permissionError } = useAdminPermission("product_moderation");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, count, error: queryError } = await supabase
      .from("products")
      .select("id,title,price,stock_quantity,status,created_at,shop_id,category_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) {
      setError(`Unable to load products: ${queryError.message}`);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Product[];
    const coverImages = new Map<string, string>();
    if (rows.length) {
      const { data: imageRows, error: imageError } = await supabase
        .from("product_images")
        .select("product_id,image_url")
        .in("product_id", rows.map((product) => product.id))
        .eq("media_type", "image")
        .order("sort_order", { ascending: true });
      // Thumbnails are optional, so a failure here still shows the catalog.
      if (imageError) console.warn("Unable to load product thumbnails:", imageError.message);
      for (const image of (imageRows ?? []) as { product_id: string; image_url: string }[]) {
        if (!coverImages.has(image.product_id)) coverImages.set(image.product_id, image.image_url);
      }
    }
    setProducts(rows.map((product) => ({ ...product, image_url: coverImages.get(product.id) ?? null })));
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadProducts(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadProducts]);

  const filteredProducts = useMemo(
    () => products.filter((product) => `${product.title} ${product.status}`.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );

  async function changeProductStatus(id: string, status: string) {
    if (!supabase) return;
    setBusyId(id);
    setError(null);
    const { error: actionError } = await supabase.rpc("admin_review_product", { target_product_id: id, new_status: status });
    if (actionError) setError(`Unable to update product: ${actionError.message}`);
    else await loadProducts();
    setBusyId(null);
  }

  return (
    <>
      <DataError message={error ?? permissionError} />
      {successMessage ? <div className={styles.alertSuccess} role="status">{successMessage}</div> : null}
      <DataSection
        title="Product catalog"
        subtitle="Review marketplace listings and keep an eye on stock."
        count={total}
        onRefresh={() => void loadProducts()}
        action={allowed ? <button className={styles.primaryButton} onClick={() => { setSuccessMessage(null); setShowCreateForm(true); }} type="button"><span aria-hidden="true">+</span> Add product</button> : undefined}
      >
        {!allowed ? <div className={styles.permissionNote}>You can view products. Product moderation permission is required to change listing status.</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Product</th><th>Price</th><th>Inventory</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td><div className={styles.personCell}><Thumbnail name={product.title} src={product.image_url} /><div><strong>{product.title}</strong><small className={styles.subCell}>ID {product.id.slice(0, 8)}</small></div></div></td>
                  <td>{formatMoney(Number(product.price))}</td>
                  <td><span className={Number(product.stock_quantity) < 5 ? styles.lowStock : ""}>{product.stock_quantity} units</span></td>
                  <td><StatusBadge status={product.status} /></td>
                  <td>{formatDate(product.created_at)}</td>
                  <td><div className={styles.rowActions}>
                    {allowed ? <Link aria-label={`Edit ${product.title}`} className={styles.iconButton} href={`/admin/products/${product.id}`} title="Edit product"><Icon name="edit" size={16} /></Link> : null}
                    <StatusSelect current={product.status} options={PRODUCT_STATUSES} disabled={!allowed || busyId === product.id} onChange={(status) => void changeProductStatus(product.id, status)} />
                  </div></td>
                </tr>
              ))}
              {!loading && !filteredProducts.length ? <EmptyRow columns={6} label={error ? "Product data could not be loaded." : "No products match your search."} /> : null}
              {loading ? <EmptyRow columns={6} label="Loading products…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>
      {showCreateForm ? (
        <ProductForm
          onClose={() => setShowCreateForm(false)}
          onCreated={(warning) => {
            setShowCreateForm(false);
            setSuccessMessage(warning ?? "Product created as pending and added to the catalog.");
            void loadProducts();
          }}
        />
      ) : null}
    </>
  );
}
