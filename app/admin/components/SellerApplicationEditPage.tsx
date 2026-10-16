"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { SellerApplication } from "../types";
import styles from "../admin.module.css";
import confirmationStyles from "./SellerApplicationEditPage.module.css";
import { DataError, Icon, StatusBadge, formatDate } from "./AdminUI";
import { SellerDetailsCard } from "./SellerDetailsCard";
import { useAdminPermission } from "./useAdminPermission";

type EditableApplication = Pick<
  SellerApplication,
  "business_name" | "contact_name" | "email" | "phone" | "address" | "district" | "state" | "notes"
> & {
  latitude: string;
  longitude: string;
};

type ApplicationRecord = SellerApplication & {
  owner_id: string;
  latitude: number | null;
  longitude: number | null;
};

function editableFields(application: ApplicationRecord): EditableApplication {
  return {
    business_name: application.business_name,
    contact_name: application.contact_name ?? "",
    email: application.email ?? "",
    phone: application.phone ?? "",
    address: application.address ?? "",
    district: application.district ?? "",
    state: application.state || "Jharkhand",
    notes: application.notes ?? "",
    latitude: application.latitude === null ? "" : String(application.latitude),
    longitude: application.longitude === null ? "" : String(application.longitude),
  };
}

function coordinateValue(value: string, label: string, min: number, max: number): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
}

export function SellerApplicationEditPage({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { allowed, loading: permissionLoading, error: permissionError } = useAdminPermission("seller_review");
  const formRef = useRef<HTMLFormElement>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [fields, setFields] = useState<EditableApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("seller_applications")
      .select("id,owner_id,business_name,contact_name,email,phone,address,district,state,notes,status,created_at,latitude,longitude")
      .eq("id", applicationId)
      .maybeSingle();
    if (queryError) {
      setError(`Unable to load seller application: ${queryError.message}`);
    } else if (!data) {
      setError("This seller application could not be found or is not available to your account.");
    } else {
      const record = data as ApplicationRecord;
      setApplication(record);
      setFields(editableFields(record));
    }
    setLoading(false);
  }, [applicationId]);

  useEffect(() => {
    if (!permissionLoading && allowed) void loadApplication();
    else if (!permissionLoading) setLoading(false);
  }, [allowed, loadApplication, permissionLoading]);

  const updateField = (field: keyof EditableApplication, value: string) => {
    setFields((current) => current ? { ...current, [field]: value } : current);
    setMessage(null);
  };

  const persistFields = async () => {
    if (!supabase || !fields || !application) throw new Error("Application data is not available.");
    const requiredFields: Array<[string, string, number, number]> = [
      ["Business name", fields.business_name, 2, 120],
      ["Contact person", fields.contact_name ?? "", 2, 120],
      ["Business email", fields.email ?? "", 5, 254],
      ["Phone number", fields.phone ?? "", 7, 40],
      ["Business address", fields.address ?? "", 3, 300],
      ["District or city", fields.district ?? "", 2, 120],
      ["State", fields.state, 2, 120],
      ["Products or services", fields.notes ?? "", 5, 2000],
    ];
    for (const [label, value, minimum, maximum] of requiredFields) {
      if (value.trim().length < minimum || value.trim().length > maximum) {
        throw new Error(`${label} must be between ${minimum} and ${maximum} characters.`);
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email?.trim() ?? "")) {
      throw new Error("Enter a valid business email address.");
    }
    const phone = fields.phone?.trim() ?? "";
    if (!/^\+?[0-9\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) {
      throw new Error("Enter a valid phone number with 7 to 15 digits.");
    }
    const latitude = coordinateValue(fields.latitude, "Latitude", -90, 90);
    const longitude = coordinateValue(fields.longitude, "Longitude", -180, 180);
    const { data, error: updateError } = await supabase
      .from("seller_applications")
      .update({
        business_name: fields.business_name.trim(),
        contact_name: fields.contact_name?.trim() || null,
        email: fields.email?.trim().toLowerCase() || null,
        phone: fields.phone?.trim() || null,
        address: fields.address?.trim() || null,
        district: fields.district?.trim() || null,
        state: fields.state.trim() || "Jharkhand",
        notes: fields.notes?.trim() || null,
        latitude,
        longitude,
      })
      .eq("id", application.id)
      .select("id")
      .maybeSingle();
    if (updateError) throw new Error(`Unable to save application details: ${updateError.message}`);
    if (!data) throw new Error("The application was not found or could not be updated.");

    setApplication((current) => current ? {
      ...current,
      ...fields,
      contact_name: fields.contact_name?.trim() || null,
      email: fields.email?.trim().toLowerCase() || null,
      phone: fields.phone?.trim() || null,
      address: fields.address?.trim() || null,
      district: fields.district?.trim() || null,
      state: fields.state.trim() || "Jharkhand",
      notes: fields.notes?.trim() || null,
      latitude,
      longitude,
    } : current);
  };

  const saveApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await persistFields();
      setMessage("Application details saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save application details.");
    } finally {
      setSaving(false);
    }
  };

  const approveApplication = async () => {
    if (!supabase || !application) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await persistFields();
      const { error: approvalError } = await supabase.rpc("admin_review_seller_application", {
        target_application_id: application.id,
        new_status: "approved",
      });
      if (approvalError) throw new Error(`Application details were saved, but approval failed: ${approvalError.message}`);
      router.push("/admin/applications");
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Unable to approve seller application.");
      setConfirmingApproval(false);
    } finally {
      setSaving(false);
    }
  };

  const editable = Boolean(application && application.status !== "approved");

  return (
    <div className={styles.shopEditLayout}>
      <section className={styles.productEditorPage}>
        <div className={styles.productEditorCard}>
          <div className={styles.modalHeading}>
            <div>
              <h2>Edit seller application</h2>
              <p>Review and update the submitted business details before approval.</p>
            </div>
            <Link className={styles.secondaryButton} href="/admin/applications">
              <Icon name="arrow" size={15} /> Applications
            </Link>
          </div>
          <DataError message={error ?? permissionError} />
          {permissionLoading || loading ? <p className={styles.productLoading}>Loading seller application…</p> : null}
          {!permissionLoading && !allowed ? <div className={styles.permissionNote}>Seller review permission is required to edit or approve applications.</div> : null}
          {message ? <div className={styles.alertSuccess} role="status">{message}</div> : null}

          {fields && application && allowed ? (
            <form ref={formRef} onSubmit={(event) => void saveApplication(event)}>
            <div className={styles.productFormSection}>
              <div className={styles.productSectionHeading}>
                <h3>Business details</h3>
                <p>Submitted {formatDate(application.created_at)} · <StatusBadge status={application.status} /></p>
              </div>
              <div className={styles.productFormGrid}>
                <label className={styles.formField}>Business / shop name
                  <input required maxLength={120} minLength={2} onChange={(event) => updateField("business_name", event.target.value)} readOnly={!editable} value={fields.business_name} />
                </label>
                <label className={styles.formField}>Contact person
                  <input required maxLength={120} minLength={2} onChange={(event) => updateField("contact_name", event.target.value)} readOnly={!editable} value={fields.contact_name ?? ""} />
                </label>
                <label className={styles.formField}>Business email
                  <input required type="email" maxLength={254} minLength={5} onChange={(event) => updateField("email", event.target.value)} readOnly={!editable} value={fields.email ?? ""} />
                </label>
                <label className={styles.formField}>Phone number
                  <input required type="tel" maxLength={40} minLength={7} onChange={(event) => updateField("phone", event.target.value)} readOnly={!editable} value={fields.phone ?? ""} />
                </label>
                <label className={`${styles.formField} ${styles.productFieldWide}`}>Business address
                  <input required maxLength={300} minLength={3} onChange={(event) => updateField("address", event.target.value)} readOnly={!editable} value={fields.address ?? ""} />
                </label>
                <label className={styles.formField}>District / city
                  <input required maxLength={120} minLength={2} onChange={(event) => updateField("district", event.target.value)} readOnly={!editable} value={fields.district ?? ""} />
                </label>
                <label className={styles.formField}>State
                  <input required maxLength={120} onChange={(event) => updateField("state", event.target.value)} readOnly={!editable} value={fields.state} />
                </label>
                <label className={`${styles.formField} ${styles.productFieldWide}`}>Products or services
                  <textarea required maxLength={2000} minLength={5} onChange={(event) => updateField("notes", event.target.value)} readOnly={!editable} rows={4} value={fields.notes ?? ""} />
                </label>
                <label className={styles.formField}>Latitude <span>(optional)</span>
                  <input max={90} min={-90} onChange={(event) => updateField("latitude", event.target.value)} readOnly={!editable} step="any" type="number" value={fields.latitude} />
                </label>
                <label className={styles.formField}>Longitude <span>(optional)</span>
                  <input max={180} min={-180} onChange={(event) => updateField("longitude", event.target.value)} readOnly={!editable} step="any" type="number" value={fields.longitude} />
                </label>
              </div>
            </div>

            {application.status === "approved" ? (
              <p className={styles.permissionNote}>This application is already approved and its shop has been created and linked to the seller.</p>
            ) : null}
            {!editable ? null : (
              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} disabled={saving} type="submit">Save changes</button>
                <button
                  className={styles.primaryButton}
                  disabled={saving}
                  onClick={(event) => {
                    event.preventDefault();
                    if (formRef.current?.reportValidity()) setConfirmingApproval(true);
                  }}
                  type="button"
                >
                  <Icon name="check" size={16} /> Approve &amp; create shop
                </button>
              </div>
            )}
            </form>
          ) : null}
        </div>
      </section>

      <SellerDetailsCard
        description="The O2N account linked to this seller application."
        ownerId={application?.owner_id ?? ""}
        showSellerDirectoryLink={false}
      />

      {confirmingApproval && application && fields ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setConfirmingApproval(false);
        }}>
          <section
            aria-labelledby="approve-application-title"
            aria-modal="true"
            className={`${styles.modal} ${confirmationStyles.confirmation}`}
            role="alertdialog"
          >
            <div className={styles.modalHeading}>
              <div>
                <h2 id="approve-application-title">Confirm seller approval</h2>
                <p>Approving creates a shop and links it to this seller account. Review the details below.</p>
              </div>
            </div>
            <dl className={confirmationStyles.details}>
              <div><dt>Business / shop</dt><dd>{fields.business_name || "—"}</dd></div>
              <div><dt>Contact person</dt><dd>{fields.contact_name || "—"}</dd></div>
              <div><dt>Email</dt><dd>{fields.email || "—"}</dd></div>
              <div><dt>Phone</dt><dd>{fields.phone || "—"}</dd></div>
              <div className={confirmationStyles.wide}><dt>Address</dt><dd>{fields.address || "—"}</dd></div>
              <div><dt>District / city</dt><dd>{fields.district || "—"}</dd></div>
              <div><dt>State</dt><dd>{fields.state || "—"}</dd></div>
              <div className={confirmationStyles.wide}><dt>Products / services</dt><dd>{fields.notes || "—"}</dd></div>
              <div><dt>Latitude</dt><dd>{fields.latitude || "—"}</dd></div>
              <div><dt>Longitude</dt><dd>{fields.longitude || "—"}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDate(application.created_at)}</dd></div>
              <div><dt>Current status</dt><dd>{application.status}</dd></div>
              <div className={confirmationStyles.wide}><dt>Seller account ID</dt><dd>{application.owner_id}</dd></div>
            </dl>
            {error ? <p className={styles.formError} role="alert">{error}</p> : null}
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} disabled={saving} onClick={() => setConfirmingApproval(false)} type="button">Cancel</button>
              <button className={styles.primaryButton} disabled={saving} onClick={() => void approveApplication()} type="button">
                {saving ? "Approving…" : "Confirm approval & create shop"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
