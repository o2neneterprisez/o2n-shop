"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, Icon } from "./AdminUI";
import { useAdminPermission } from "./useAdminPermission";

type Seller = {
  id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type SellerFormValues = {
  displayName: string;
  email: string;
  phone: string;
};

export function SellerManagement() {
  const { search } = useAdminContext();
  const { allowed, loading: permissionLoading, error: permissionError } = useAdminPermission("seller_review");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formSeller, setFormSeller] = useState<Seller | null | undefined>(undefined);
  const [formValues, setFormValues] = useState<SellerFormValues>({ displayName: "", email: "", phone: "" });

  const loadSellers = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    if (!allowed) {
      setSellers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(`Unable to verify your session: ${sessionError.message}`);
      setLoading(false);
      return;
    }
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Your session has expired. Sign in again to manage sellers.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/sellers", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json() as { sellers?: Seller[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load sellers.");
      setSellers(result.sellers ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load sellers.");
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSellers(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSellers]);

  const filteredSellers = useMemo(
    () => sellers.filter((seller) =>
      `${seller.display_name ?? ""} ${seller.email ?? ""} ${seller.phone ?? ""} ${seller.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
    [search, sellers],
  );

  function openCreateForm() {
    setFormSeller(null);
    setFormValues({ displayName: "", email: "", phone: "" });
    setError(null);
    setSuccessMessage(null);
  }

  function openEditForm(seller: Seller) {
    setFormSeller(seller);
    setFormValues({
      displayName: seller.display_name ?? "",
      email: seller.email ?? "",
      phone: seller.phone ?? "",
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function saveSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setError(sessionError ? `Unable to verify your session: ${sessionError.message}` : "Your session has expired. Sign in again.");
      setSaving(false);
      return;
    }

    try {
      const editing = Boolean(formSeller);
      const response = await fetch("/api/admin/sellers", {
        method: editing ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editing ? { id: formSeller?.id } : { email: formValues.email }),
          displayName: formValues.displayName,
          phone: formValues.phone,
        }),
      });
      const result = await response.json() as { seller?: Seller; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save seller.");
      if (!result.seller) throw new Error("The seller was saved, but no seller details were returned.");
      setFormSeller(undefined);
      setSellers((current) => editing
        ? current.map((seller) => seller.id === result.seller?.id ? result.seller! : seller)
        : [result.seller!, ...current]);
      setSuccessMessage(editing ? "Seller details updated." : `Invitation sent to ${result.seller.email ?? formValues.email}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save seller.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DataError message={error ?? permissionError} />
      {successMessage ? <div className={styles.alertSuccess} role="status">{successMessage}</div> : null}
      <DataSection
        title="Seller directory"
        subtitle="Invite sellers and manage their contact details."
        count={sellers.length}
        onRefresh={() => void loadSellers()}
        action={allowed ? <button className={styles.primaryButton} onClick={openCreateForm} type="button"><Icon name="plus" size={16} /> Add seller</button> : undefined}
      >
        {!allowed && !permissionLoading
          ? <div className={styles.permissionNote}>Seller review permission is required to view and manage seller accounts.</div>
          : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Seller</th><th>Email</th><th>Phone</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredSellers.map((seller) => (
                <tr key={seller.id}>
                  <td>
                    <div className={styles.personCell}>
                      <span className={styles.customerAvatar}>{(seller.display_name || "S").slice(0, 1).toUpperCase()}</span>
                      <strong>{seller.display_name || "Seller"}</strong>
                    </div>
                    <small className={styles.subCell}>ID {seller.id.slice(0, 8)}</small>
                  </td>
                  <td>{seller.email || "—"}</td>
                  <td>{seller.phone || "—"}</td>
                  <td>{formatDate(seller.created_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button aria-label={`Edit ${seller.display_name || "seller"}`} className={styles.iconButton} onClick={() => openEditForm(seller)} title="Edit seller" type="button">
                        <Icon name="edit" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !filteredSellers.length
                ? <EmptyRow columns={5} label={error ? "Seller data could not be loaded." : "No sellers match your search."} />
                : null}
              {loading || permissionLoading ? <EmptyRow columns={5} label="Loading sellers…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>

      {formSeller !== undefined ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormSeller(undefined); }} role="presentation">
          <form aria-labelledby="seller-form-title" aria-modal="true" className={styles.modal} onSubmit={(event) => void saveSeller(event)} role="dialog">
            <div className={styles.modalHeading}>
              <div>
                <h2 id="seller-form-title">{formSeller ? "Edit seller" : "Invite a seller"}</h2>
                <p>{formSeller ? "Update the seller’s profile and contact number." : "Send an invitation link so the seller can set a password."}</p>
              </div>
              <button aria-label="Close" className={styles.iconButton} disabled={saving} onClick={() => setFormSeller(undefined)} type="button">
                <Icon name="close" size={18} />
              </button>
            </div>
            {error ? <p className={styles.formError} role="alert">{error}</p> : null}
            <label className={styles.formField}>
              Seller name
              <input autoFocus maxLength={120} minLength={2} onChange={(event) => setFormValues((current) => ({ ...current, displayName: event.target.value }))} required value={formValues.displayName} />
            </label>
            <label className={styles.formField}>
              Email {formSeller ? <span>(managed by the seller’s login account)</span> : null}
              <input
                autoComplete="email"
                disabled={Boolean(formSeller)}
                maxLength={254}
                onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                required={!formSeller}
                type="email"
                value={formValues.email}
              />
            </label>
            <label className={styles.formField}>
              Phone <span>(optional)</span>
              <input autoComplete="tel" maxLength={40} onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))} type="tel" value={formValues.phone} />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} disabled={saving} onClick={() => setFormSeller(undefined)} type="button">Cancel</button>
              <button className={styles.primaryButton} disabled={saving} type="submit">{saving ? "Saving…" : formSeller ? "Save changes" : "Send invitation"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
