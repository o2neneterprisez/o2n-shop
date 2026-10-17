"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { supabase } from "@/lib/supabase/client";
import type { MapPoint } from "./LocationPicker";
import styles from "./ProfilePage.module.css";
import addressStyles from "./AddressesPage.module.css";
import { useAccountUser } from "./useAccountUser";

// The map only works in the browser, so it is never server-rendered.
const LocationPicker = dynamic(() => import("./LocationPicker").then((module) => module.LocationPicker), {
  ssr: false,
  loading: () => <div className={addressStyles.mapPlaceholder}>Loading map…</div>,
});

const LABELS = ["Home", "Work", "Other"] as const;
type AddressLabel = (typeof LABELS)[number];

type Address = {
  id: string;
  label: AddressLabel;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
};

type AddressForm = {
  label: AddressLabel;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  location: MapPoint | null;
  isDefault: boolean;
};

const ADDRESS_COLUMNS = "id,label,full_name,phone,address_line1,address_line2,landmark,city,state,postal_code,latitude,longitude,is_default,created_at";

function emptyForm(fullName: string): AddressForm {
  return {
    label: "Home",
    fullName,
    phone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "Jharkhand",
    postalCode: "",
    location: null,
    isDefault: false,
  };
}

function formFromAddress(address: Address): AddressForm {
  return {
    label: address.label,
    fullName: address.full_name,
    phone: address.phone,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2 ?? "",
    landmark: address.landmark ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    location: address.latitude !== null && address.longitude !== null ? { lat: address.latitude, lng: address.longitude } : null,
    isDefault: address.is_default,
  };
}

function validate(form: AddressForm) {
  if (form.fullName.trim().length < 2) return "Enter the name of the person receiving the delivery.";
  if (!/^[0-9]{10}$/.test(form.phone.replace(/\D/g, ""))) return "Enter a 10-digit mobile number.";
  if (form.addressLine1.trim().length < 3) return "Enter the house number and street.";
  if (form.city.trim().length < 2) return "Enter the city or district.";
  if (form.state.trim().length < 2) return "Enter the state.";
  if (!/^[1-9][0-9]{5}$/.test(form.postalCode.trim())) return "Enter a valid 6-digit PIN code.";
  return null;
}

function sortAddresses(addresses: Address[]) {
  return [...addresses].sort((left, right) =>
    Number(right.is_default) - Number(left.is_default) || right.created_at.localeCompare(left.created_at));
}

export function AddressesPage() {
  const { user, ready } = useAccountUser();
  const userId = user?.id;
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // undefined: form closed, null: adding a new address, Address: editing it.
  const [editing, setEditing] = useState<Address | null | undefined>(undefined);
  const [form, setForm] = useState<AddressForm>(emptyForm(""));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAddresses = useCallback(async (id: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("user_addresses")
      .select(ADDRESS_COLUMNS)
      // Admins can read every address, so always limit this page to the shopper's own.
      .eq("user_id", id);
    if (error) {
      setLoadError(`Unable to load your addresses: ${error.message}`);
    } else {
      setLoadError(null);
      setAddresses(sortAddresses((data ?? []) as Address[]));
    }
    setLoadedFor(id);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const timeout = window.setTimeout(() => void loadAddresses(userId), 0);
    return () => window.clearTimeout(timeout);
  }, [loadAddresses, userId]);

  const loading = Boolean(user) && loadedFor !== userId;

  function openAddForm() {
    setEditing(null);
    setForm(emptyForm(user?.displayName ?? ""));
    setFormError(null);
    setMessage(null);
  }

  function openEditForm(address: Address) {
    setEditing(address);
    setForm(formFromAddress(address));
    setFormError(null);
    setMessage(null);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId) return;
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
      return;
    }

    setSaving(true);
    setFormError(null);
    const values = {
      label: form.label,
      full_name: form.fullName.trim(),
      phone: form.phone.replace(/\D/g, ""),
      address_line1: form.addressLine1.trim(),
      address_line2: form.addressLine2.trim() || null,
      landmark: form.landmark.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      postal_code: form.postalCode.trim(),
      latitude: form.location?.lat ?? null,
      longitude: form.location?.lng ?? null,
      is_default: form.isDefault,
    };
    const { error } = editing
      ? await supabase.from("user_addresses").update(values).eq("id", editing.id).eq("user_id", userId)
      : await supabase.from("user_addresses").insert({ ...values, user_id: userId });
    setSaving(false);
    if (error) {
      setFormError(`Unable to save this address: ${error.message}`);
      return;
    }
    setMessage(editing ? "Address updated." : "Address added.");
    setEditing(undefined);
    await loadAddresses(userId);
  }

  async function makeDefault(address: Address) {
    if (!supabase || !userId) return;
    setBusyId(address.id);
    setActionError(null);
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", address.id).eq("user_id", userId);
    if (error) setActionError(`Unable to set the default address: ${error.message}`);
    else await loadAddresses(userId);
    setBusyId(null);
  }

  async function deleteAddress(address: Address) {
    if (!supabase || !userId) return;
    setBusyId(address.id);
    setActionError(null);
    const { error } = await supabase.from("user_addresses").delete().eq("id", address.id).eq("user_id", userId);
    if (error) {
      setActionError(`Unable to delete this address: ${error.message}`);
    } else {
      setMessage("Address deleted.");
      if (editing?.id === address.id) setEditing(undefined);
      await loadAddresses(userId);
    }
    setConfirmDeleteId(null);
    setBusyId(null);
  }

  const field = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
      <MarketplaceHeader />
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={`${styles.intro} ${addressStyles.introRow}`}>
            <div>
              <span className={styles.eyebrow}>YOUR ACCOUNT</span>
              <h1>My addresses</h1>
              <p>Save delivery addresses and pin the exact spot on the map.</p>
            </div>
            {user && editing === undefined ? <button className="btn primary" onClick={openAddForm} type="button">＋ Add address</button> : null}
          </div>

          {!ready || loading ? <p className={styles.notice} role="status">Loading your addresses…</p> : null}

          {ready && !user ? (
            <div className={styles.notice}>
              <p>Sign in to manage your saved addresses.</p>
              <Link className="btn primary" href="/auth/login?next=%2Faccount%2Faddresses">Sign in</Link>
            </div>
          ) : null}

          {loadError ? <p className={styles.error} role="alert">{loadError}</p> : null}
          {actionError ? <p className={styles.error} role="alert">{actionError}</p> : null}
          {message && editing === undefined ? <p className={styles.success} role="status">{message}</p> : null}

          {user && editing !== undefined ? (
            <form className={addressStyles.form} onSubmit={(event) => void saveAddress(event)}>
              <h2>{editing ? "Edit address" : "Add a new address"}</h2>

              <div className={addressStyles.labels} role="radiogroup" aria-label="Address type">
                {LABELS.map((label) => (
                  <label className={form.label === label ? addressStyles.labelActive : undefined} key={label}>
                    <input checked={form.label === label} name="address-label" onChange={() => field("label", label)} type="radio" />
                    {label === "Home" ? "🏠" : label === "Work" ? "🏢" : "📍"} {label}
                  </label>
                ))}
              </div>

              <div className={styles.fields}>
                <label>Full name
                  <input autoComplete="name" maxLength={120} onChange={(event) => field("fullName", event.target.value)} required value={form.fullName} />
                </label>
                <label>Mobile number
                  <input autoComplete="tel" inputMode="numeric" maxLength={14} onChange={(event) => field("phone", event.target.value)} placeholder="10-digit mobile number" required type="tel" value={form.phone} />
                </label>
                <label className={styles.fullWidth}>House no., building and street
                  <input autoComplete="address-line1" maxLength={200} onChange={(event) => field("addressLine1", event.target.value)} required value={form.addressLine1} />
                </label>
                <label className={styles.fullWidth}>Area, colony or locality <span className={styles.optional}>(optional)</span>
                  <input autoComplete="address-line2" maxLength={200} onChange={(event) => field("addressLine2", event.target.value)} value={form.addressLine2} />
                </label>
                <label>Landmark <span className={styles.optional}>(optional)</span>
                  <input maxLength={120} onChange={(event) => field("landmark", event.target.value)} placeholder="e.g. Near City Hospital" value={form.landmark} />
                </label>
                <label>City / district
                  <input autoComplete="address-level2" maxLength={120} onChange={(event) => field("city", event.target.value)} required value={form.city} />
                </label>
                <label>State
                  <input autoComplete="address-level1" maxLength={120} onChange={(event) => field("state", event.target.value)} required value={form.state} />
                </label>
                <label>PIN code
                  <input autoComplete="postal-code" inputMode="numeric" maxLength={6} onChange={(event) => field("postalCode", event.target.value.replace(/\D/g, ""))} pattern="[1-9][0-9]{5}" required value={form.postalCode} />
                </label>
              </div>

              <div className={addressStyles.mapBlock}>
                <span className={addressStyles.mapLabel}>Exact location <span className={styles.optional}>(optional, helps the delivery partner find you)</span></span>
                <LocationPicker onChange={(point) => field("location", point)} value={form.location} />
              </div>

              <label className={addressStyles.checkbox}>
                <input checked={form.isDefault} disabled={Boolean(editing?.is_default)} onChange={(event) => field("isDefault", event.target.checked)} type="checkbox" />
                {editing?.is_default ? "This is your default address" : "Make this my default address"}
              </label>

              {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
              <div className={addressStyles.formActions}>
                <button className="btn primary" disabled={saving} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "Save address"}</button>
                <button className="btn secondary" disabled={saving} onClick={() => setEditing(undefined)} type="button">Cancel</button>
              </div>
            </form>
          ) : null}

          {user && addresses && !addresses.length && editing === undefined ? (
            <div className={addressStyles.empty}>
              <span aria-hidden="true">📭</span>
              <h2>No saved addresses</h2>
              <p>Add an address so checkout is quicker next time.</p>
              <button className="btn primary" onClick={openAddForm} type="button">＋ Add address</button>
            </div>
          ) : null}

          {user && addresses?.length ? (
            <ul className={addressStyles.list}>
              {addresses.map((address) => (
                <li className={`${addressStyles.address} ${address.is_default ? addressStyles.addressDefault : ""}`} key={address.id}>
                  <div className={addressStyles.addressTags}>
                    <span className={addressStyles.tag}>{address.label}</span>
                    {address.is_default ? <span className={`${addressStyles.tag} ${addressStyles.tagDefault}`}>Default</span> : null}
                  </div>
                  <strong>{address.full_name}</strong>
                  <p>
                    {address.address_line1}
                    {address.address_line2 ? `, ${address.address_line2}` : ""}
                    {address.landmark ? <><br />Landmark: {address.landmark}</> : null}
                    <br />{address.city}, {address.state} {address.postal_code}
                  </p>
                  <small>📞 {address.phone}</small>
                  {address.latitude !== null && address.longitude !== null ? (
                    <a
                      className={addressStyles.mapLink}
                      href={`https://www.openstreetmap.org/?mlat=${address.latitude}&mlon=${address.longitude}#map=18/${address.latitude}/${address.longitude}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      📍 View pinned location
                    </a>
                  ) : <small className={addressStyles.noPin}>No map pin</small>}

                  {confirmDeleteId === address.id ? (
                    <div className={addressStyles.confirm}>
                      <span>Delete this address?</span>
                      <button className={addressStyles.dangerButton} disabled={busyId === address.id} onClick={() => void deleteAddress(address)} type="button">
                        {busyId === address.id ? "Deleting…" : "Delete"}
                      </button>
                      <button className={addressStyles.textButton} onClick={() => setConfirmDeleteId(null)} type="button">Keep</button>
                    </div>
                  ) : (
                    <div className={addressStyles.addressActions}>
                      <button className={addressStyles.textButton} disabled={saving} onClick={() => openEditForm(address)} type="button">Edit</button>
                      <button className={addressStyles.textButtonDanger} onClick={() => setConfirmDeleteId(address.id)} type="button">Delete</button>
                      {!address.is_default ? (
                        <button className={addressStyles.textButton} disabled={busyId === address.id} onClick={() => void makeDefault(address)} type="button">Set as default</button>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </main>
    </>
  );
}
