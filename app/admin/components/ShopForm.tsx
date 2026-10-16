"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "../admin.module.css";
import { Icon } from "./AdminUI";

type SellerOption = { id: string; display_name: string | null; email?: string };
type ExistingShop = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  state: string;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function getProductImageStoragePath(imageUrl: string) {
  try {
    const marker = "/storage/v1/object/public/product-images/";
    const pathname = new URL(imageUrl).pathname;
    const markerIndex = pathname.indexOf(marker);
    return markerIndex < 0 ? null : decodeURIComponent(pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export function ShopForm({
  onClose,
  onOwnerChange,
  onSaved,
  shopId,
}: {
  onClose: () => void;
  onOwnerChange?: (ownerId: string) => void;
  onSaved: (warning?: string) => void;
  shopId?: string;
}) {
  const editing = Boolean(shopId);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerInviteMessage, setOwnerInviteMessage] = useState<string | null>(null);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Jharkhand");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [status, setStatus] = useState("");
  const logoPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void (async () => {
        if (!supabase) {
          setError("Supabase is not configured.");
          setLoading(false);
          return;
        }
        try {
          const [sellerResult, authResult, shopResult] = await Promise.all([
            supabase.from("profiles").select("id,display_name").eq("role", "seller").order("display_name"),
            supabase.auth.getUser(),
            shopId
              ? supabase.from("shops").select("id,owner_id,name,slug,description,contact_email,phone,address,district,state,logo_url,latitude,longitude,status").eq("id", shopId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);
          if (sellerResult.error) throw new Error(`Unable to load sellers: ${sellerResult.error.message}`);
          const loadedSellers = (sellerResult.data ?? []) as SellerOption[];
          setSellers(loadedSellers);
          if (!shopId && !loadedSellers.length) setShowOwnerForm(true);
          if (authResult.error) {
            const message = authResult.error.message === "Auth session missing!"
              ? "Your admin session has expired. Sign in again before creating a shop or inviting an owner."
              : `Unable to verify your session: ${authResult.error.message}`;
            throw new Error(message);
          }
          setUserId(authResult.data.user?.id ?? null);
          if (shopId) {
            if (shopResult.error) throw new Error(`Unable to load shop: ${shopResult.error.message}`);
            if (!shopResult.data) throw new Error("This shop could not be found or is not available to your account.");
            const shop = shopResult.data as ExistingShop & { status: string };
            setOwnerId(shop.owner_id);
            setName(shop.name);
            setSlug(shop.slug);
            setSlugEdited(true);
            setDescription(shop.description ?? "");
            setEmail(shop.contact_email ?? "");
            setPhone(shop.phone ?? "");
            setAddress(shop.address ?? "");
            setDistrict(shop.district ?? "");
            setState(shop.state || "Jharkhand");
            setLatitude(shop.latitude === null ? "" : String(shop.latitude));
            setLongitude(shop.longitude === null ? "" : String(shop.longitude));
            setLogoUrl(shop.logo_url ?? "");
            setLogoPreview(shop.logo_url ?? "");
            setStatus(shop.status);
            if (!sellerResult.data?.some((seller) => seller.id === shop.owner_id)) {
              setSellers((sellerResult.data ?? []).concat([{ id: shop.owner_id, display_name: "Current owner" }]) as SellerOption[]);
            }
          }
        } catch (loadError) {
          setError(errorMessage(loadError));
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [shopId]);

  useEffect(() => {
    onOwnerChange?.(ownerId);
  }, [onOwnerChange, ownerId]);

  useEffect(() => () => {
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
  }, []);

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the shop logo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("The shop logo must be 8 MB or smaller.");
      return;
    }
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    const preview = URL.createObjectURL(file);
    logoPreviewRef.current = preview;
    setLogoFile(file);
    setLogoPreview(preview);
    setRemoveLogo(false);
  }

  async function inviteShopOwner() {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (newOwnerName.trim().length < 2 || newOwnerName.trim().length > 120) {
      setError("Enter an owner name between 2 and 120 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOwnerEmail.trim()) || newOwnerEmail.trim().length > 254) {
      setError("Enter a valid owner email address.");
      return;
    }
    setInviting(true);
    setError(null);
    setOwnerInviteMessage(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Unable to verify your session: ${sessionError.message}`);
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your session has expired. Sign in again to invite a shop owner.");

      const response = await fetch("/api/admin/shop-owners", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: newOwnerName.trim(), email: newOwnerEmail.trim() }),
      });
      const result = await response.json() as {
        seller?: { id: string; displayName: string; email: string };
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Unable to invite the shop owner.");
      if (!result.seller) throw new Error("The invitation succeeded, but no seller account was returned.");

      const seller = result.seller;
      setSellers((current) => current.some((item) => item.id === seller.id)
        ? current
        : [...current, { id: seller.id, display_name: seller.displayName, email: seller.email }]);
      setOwnerId(seller.id);
      setNewOwnerName("");
      setNewOwnerEmail("");
      setShowOwnerForm(false);
      setOwnerInviteMessage(`Invitation sent to ${seller.email}. They are now selected as this shop’s owner.`);
    } catch (inviteError) {
      setError(errorMessage(inviteError));
    } finally {
      setInviting(false);
    }
  }

  async function removeUploadedLogo(paths: string[]) {
    if (!supabase || !paths.length) return null;
    try {
      const { error: removeError } = await supabase.storage.from("product-images").remove(paths);
      return removeError?.message ?? null;
    } catch (removeError) {
      return errorMessage(removeError);
    }
  }

  async function saveShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (!ownerId) {
      setError("Choose a seller who will own this shop.");
      return;
    }
    const normalizedSlug = slugify(slug);
    if (!normalizedSlug) {
      setError("Enter a shop name or URL slug containing letters or numbers.");
      return;
    }
    const parsedLatitude = latitude.trim() ? Number(latitude) : null;
    const parsedLongitude = longitude.trim() ? Number(longitude) : null;
    if (parsedLatitude !== null && (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (parsedLongitude !== null && (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180)) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    setSaving(true);
    setError(null);
    const uploadedPaths: string[] = [];
    const destinationShopId = shopId ?? crypto.randomUUID();
    try {
      let nextLogoUrl = removeLogo ? null : logoUrl.trim() || null;
      if (logoFile) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Unable to verify your session: ${authError.message}`);
        if (!authData.user) throw new Error("Your session has expired. Sign in again to save this shop.");
        const safeName = logoFile.name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-|-$/g, "") || "logo";
        const path = `${authData.user.id}/shops/${destinationShopId}/${crypto.randomUUID()}-${safeName}`;
        uploadedPaths.push(path);
        const { error: uploadError } = await supabase.storage.from("product-images").upload(path, logoFile, {
          cacheControl: "3600",
          contentType: logoFile.type,
          upsert: false,
        });
        if (uploadError) throw new Error(`Unable to upload shop logo: ${uploadError.message}`);
        nextLogoUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      const shopValues = {
        id: destinationShopId,
        owner_id: ownerId,
        name: name.trim(),
        slug: normalizedSlug,
        description: description.trim() || null,
        contact_email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        district: district.trim() || null,
        state: state.trim() || "Jharkhand",
        logo_url: nextLogoUrl,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      };
      const result = editing
        ? await supabase.rpc("admin_update_shop", { p_shop_id: shopId, p_shop: shopValues })
        : await supabase.rpc("admin_create_shop", { p_shop: shopValues });
      if (result.error) throw new Error(`Unable to ${editing ? "update" : "create"} shop: ${result.error.message}`);
      const oldLogoPath = logoUrl ? getProductImageStoragePath(logoUrl) : null;
      const logoChanged = removeLogo || Boolean(logoFile);
      const canRemoveOldLogo = Boolean(oldLogoPath && userId && oldLogoPath.startsWith(`${userId}/`));
      const cleanupError = editing && logoChanged && canRemoveOldLogo ? await removeUploadedLogo([oldLogoPath!]) : null;
      onSaved(cleanupError ? `Shop saved, but the previous logo could not be removed: ${cleanupError}` : undefined);
    } catch (saveError) {
      const message = errorMessage(saveError);
      const cleanupError = await removeUploadedLogo(uploadedPaths);
      setError(cleanupError
        ? `${message} Logo cleanup also failed: ${cleanupError}. An uploaded file may remain in product-images.`
        : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={editing ? styles.productEditorPage : styles.modalBackdrop}
      role={editing ? undefined : "presentation"}
      onMouseDown={(event) => { if (!editing && event.target === event.currentTarget && !saving) onClose(); }}
    >
      <form
        aria-labelledby="shop-form-title"
        aria-modal={editing ? undefined : true}
        className={`${editing ? styles.productEditorCard : styles.modal} ${styles.productModal}`}
        onSubmit={(event) => void saveShop(event)}
        role={editing ? undefined : "dialog"}
      >
        <div className={styles.modalHeading}>
          <div><h2 id="shop-form-title">{editing ? "Edit shop" : "Add a shop"}</h2><p>{editing ? "Update the storefront profile and contact information." : "Create a storefront profile for a seller."}</p></div>
          <button aria-label={editing ? "Back to shops" : "Close"} className={styles.iconButton} disabled={saving} onClick={onClose} type="button"><Icon name={editing ? "arrow" : "close"} size={18} /></button>
        </div>

        {loading ? <div className={styles.productLoading}>Loading shop details…</div> : null}
        {error ? <p className={styles.formError} role="alert">{error}</p> : null}

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Storefront information</h3><p>Set the shop name, URL, description, and owner.</p></div>
          <div className={styles.productFormGrid}>
            <label className={`${styles.formField} ${styles.productFieldWide}`}>Shop name
              <input autoFocus={!editing} disabled={loading} maxLength={120} minLength={2} onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }} required value={name} />
            </label>
            <label className={styles.formField}>Shop owner (required)
              <select disabled={loading || inviting} onChange={(event) => setOwnerId(event.target.value)} required value={ownerId}>
                <option value="">Select a seller</option>
                {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.display_name || `Seller ${seller.id.slice(0, 8)}`}</option>)}
              </select>
              {!editing && !loading && !sellers.length
                ? <span>No seller accounts are available yet. Invite an owner below; they will be selected automatically.</span>
                : null}
            </label>
            {!editing ? (
              <div className={styles.formField}>
                <span>Need a new owner?</span>
                <button className={styles.secondaryButton} disabled={loading || inviting} onClick={() => {
                  setShowOwnerForm((shown) => !shown);
                  setError(null);
                }} type="button"><Icon name={showOwnerForm ? "close" : "plus"} size={15} /> {showOwnerForm ? "Cancel invite" : "Add shop owner"}</button>
              </div>
            ) : null}
            {!editing && showOwnerForm ? (
              <div className={`${styles.shopOwnerInvite} ${styles.productFieldWide}`}>
                <div className={styles.productSectionHeading}>
                  <h3>Invite a shop owner</h3>
                  <p>We’ll create a seller account and email them a secure link to set their password.</p>
                </div>
                <div className={styles.productFormGrid}>
                  <label className={styles.formField}>Owner name<input autoComplete="name" maxLength={120} minLength={2} onChange={(event) => setNewOwnerName(event.target.value)} value={newOwnerName} /></label>
                  <label className={styles.formField}>Owner email<input autoComplete="email" maxLength={254} onChange={(event) => setNewOwnerEmail(event.target.value)} type="email" value={newOwnerEmail} /></label>
                </div>
                <button className={styles.secondaryButton} disabled={inviting || loading} onClick={() => void inviteShopOwner()} type="button">{inviting ? "Sending invitation…" : "Send invite and select owner"}</button>
              </div>
            ) : null}
            {ownerInviteMessage ? <p className={`${styles.productFieldWide} ${styles.shopInviteSuccess}`} role="status">{ownerInviteMessage}</p> : null}
            <label className={styles.formField}>URL slug
              <input disabled={loading} maxLength={120} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} required value={slug} />
            </label>
            <label className={`${styles.formField} ${styles.productFieldWide}`}>Description <span>(optional)</span>
              <textarea disabled={loading} maxLength={5000} onChange={(event) => setDescription(event.target.value)} rows={4} value={description} />
            </label>
            <div className={`${styles.formField} ${styles.productFieldWide}`}>Shop logo <span>(optional, image up to 8 MB)</span>
              <label className={styles.productUploadButton}><Icon name="plus" size={17} /> Choose logo<input accept="image/*" disabled={saving || loading} onChange={selectLogo} type="file" /></label>
              {logoPreview ? (
                <div className={styles.shopLogoPreview}>
                  <Image alt="Shop logo preview" height={88} src={logoPreview} unoptimized width={88} />
                  <button className={styles.secondaryButton} disabled={saving} onClick={() => {
                    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
                    logoPreviewRef.current = null;
                    setLogoFile(null);
                    setLogoPreview("");
                    setRemoveLogo(true);
                    setLogoUrl("");
                  }} type="button">Remove logo</button>
                </div>
              ) : null}
            </div>
            {editing ? <div className={styles.productFieldWide}><span className={styles.shopStatusNote}>Current status: <strong>{status}</strong>. Use the Shops list to change approval status.</span></div> : null}
          </div>
        </section>

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Contact & location</h3><p>Details customers can use to find and contact the shop.</p></div>
          <div className={styles.productFormGrid}>
            <label className={styles.formField}>Contact email<input disabled={loading} maxLength={254} onChange={(event) => setEmail(event.target.value)} type="email" value={email} /></label>
            <label className={styles.formField}>Phone<input disabled={loading} maxLength={40} onChange={(event) => setPhone(event.target.value)} type="tel" value={phone} /></label>
            <label className={`${styles.formField} ${styles.productFieldWide}`}>Address<input disabled={loading} maxLength={500} onChange={(event) => setAddress(event.target.value)} value={address} /></label>
            <label className={styles.formField}>District<input disabled={loading} maxLength={120} onChange={(event) => setDistrict(event.target.value)} value={district} /></label>
            <label className={styles.formField}>State<input disabled={loading} maxLength={120} onChange={(event) => setState(event.target.value)} required value={state} /></label>
            <label className={styles.formField}>Latitude <span>(optional)</span><input disabled={loading} max="90" min="-90" onChange={(event) => setLatitude(event.target.value)} step="any" type="number" value={latitude} /></label>
            <label className={styles.formField}>Longitude <span>(optional)</span><input disabled={loading} max="180" min="-180" onChange={(event) => setLongitude(event.target.value)} step="any" type="number" value={longitude} /></label>
          </div>
        </section>

        <div className={styles.modalActions}>
          <p className={styles.productPendingNote}>
            {editing
              ? "Shop status is managed separately."
              : !ownerId
                ? "Select an existing seller or invite a new owner before creating the shop."
                : !userId
                  ? "Sign in again before creating the shop."
                  : "New shops are created with pending status."}
          </p>
          <button className={styles.secondaryButton} disabled={saving} onClick={onClose} type="button">{editing ? "Back to shops" : "Cancel"}</button>
          <button className={styles.primaryButton} disabled={saving || loading || !ownerId || !userId || Boolean(error && editing)} type="submit">{saving ? "Saving shop…" : editing ? "Save changes" : "Create shop"}</button>
        </div>
      </form>
    </div>
  );
}
