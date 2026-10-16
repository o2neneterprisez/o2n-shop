"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, Icon, StatusBadge, StatusSelect, Thumbnail } from "./AdminUI";
import { ShopForm } from "./ShopForm";
import { useAdminPermission } from "./useAdminPermission";

const SHOP_STATUSES = ["pending", "approved", "rejected", "suspended"];

export function ShopManagement() {
  const { search } = useAdminContext();
  const { allowed, error: permissionError } = useAdminPermission("shop_moderation");
  const [shops, setShops] = useState<Shop[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, count, error: queryError } = await supabase
      .from("shops")
      .select("id,name,status,contact_email,district,created_at,owner_id,logo_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) {
      setError(`Unable to load shops: ${queryError.message}`);
    } else {
      setShops((data ?? []) as Shop[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadShops(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadShops]);

  const filteredShops = useMemo(
    () => shops.filter((shop) => `${shop.name} ${shop.district ?? ""} ${shop.status}`.toLowerCase().includes(search.toLowerCase())),
    [search, shops],
  );

  async function changeShopStatus(id: string, status: string) {
    if (!supabase) return;
    setBusyId(id);
    setError(null);
    const { error: actionError } = await supabase.rpc("admin_review_shop", { target_shop_id: id, new_status: status });
    if (actionError) {
      setError(`Unable to update shop: ${actionError.message}`);
    } else {
      await loadShops();
    }
    setBusyId(null);
  }

  return (
    <>
      <DataError message={error ?? permissionError} />
      {successMessage ? <div className={styles.alertSuccess} role="status">{successMessage}</div> : null}
      <DataSection
        title="Shop directory"
        subtitle="Review and manage seller storefronts."
        count={total}
        onRefresh={() => void loadShops()}
        action={allowed ? <button className={styles.primaryButton} onClick={() => { setSuccessMessage(null); setShowCreateForm(true); }} type="button"><Icon name="plus" size={16} /> Add shop</button> : undefined}
      >
        {!allowed ? <div className={styles.permissionNote}>You can view shops. Shop moderation permission is required to change their status.</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Shop</th><th>Location</th><th>Contact</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredShops.map((shop) => (
                <tr key={shop.id}>
                  <td><div className={styles.personCell}><Thumbnail name={shop.name} src={shop.logo_url} /><div><strong>{shop.name}</strong><small className={styles.subCell}>ID {shop.id.slice(0, 8)}</small></div></div></td>
                  <td>{shop.district || "—"}</td>
                  <td>{shop.contact_email || "—"}</td>
                  <td><StatusBadge status={shop.status} /></td>
                  <td>{formatDate(shop.created_at)}</td>
                  <td><div className={styles.rowActions}>
                    {allowed ? <Link aria-label={`Edit ${shop.name}`} className={styles.iconButton} href={`/admin/shops/${shop.id}`} title="Edit shop"><Icon name="edit" size={16} /></Link> : null}
                    <StatusSelect current={shop.status} options={SHOP_STATUSES} disabled={!allowed || busyId === shop.id} onChange={(status) => void changeShopStatus(shop.id, status)} />
                  </div></td>
                </tr>
              ))}
              {!loading && !filteredShops.length ? <EmptyRow columns={6} label={error ? "Shop data could not be loaded." : "No shops match your search."} /> : null}
              {loading ? <EmptyRow columns={6} label="Loading shops…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>
      {showCreateForm ? (
        <ShopForm
          onClose={() => setShowCreateForm(false)}
          onSaved={() => {
            setShowCreateForm(false);
            setSuccessMessage("Shop created with pending status.");
            void loadShops();
          }}
        />
      ) : null}
    </>
  );
}
