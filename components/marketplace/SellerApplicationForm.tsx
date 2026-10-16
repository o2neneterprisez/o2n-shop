"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { NoticeSection } from "@/components/marketplace/sections";
import { supabase } from "@/lib/supabase/client";
import { useAppSelector } from "@/lib/store/hooks";
import styles from "./SellerApplicationForm.module.css";

type ApplicationFields = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  state: string;
  notes: string;
};

const initialFields: ApplicationFields = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  district: "",
  state: "Jharkhand",
  notes: "",
};

export function SellerApplicationForm() {
  const user = useAppSelector((state) => state.auth.user);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const [fields, setFields] = useState(initialFields);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{ status: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      setCheckingApplication(false);
      return;
    }
    if (!supabase) {
      setError("Seller applications are not available because Supabase is not configured.");
      setCheckingApplication(false);
      return;
    }

    let active = true;
    void supabase
      .from("seller_applications")
      .select("status")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(`Unable to check for an existing application: ${queryError.message}`);
        else setExistingApplication(data);
        setCheckingApplication(false);
      });

    return () => {
      active = false;
    };
  }, [initialized, user]);

  const updateField = (field: keyof ApplicationFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!supabase || !user) {
      setError("Sign in to your O2N account before submitting a seller application.");
      return;
    }
    if (existingApplication) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Unable to verify your session: ${sessionError.message}`);
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your session has expired. Sign in again before submitting.");

      const response = await fetch("/api/seller-applications", {
        method: "POST",
        headers: {
          Authorization: ["Bearer", accessToken].join(" "),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fields),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to submit your application.");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <NoticeSection />
      <MarketplaceHeader showSearch />
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>SELL WITH O2N</span>
            <h1>Apply to sell on O2N</h1>
            <p>Tell us about your business and what you would like to offer. Our team will review your application.</p>
          </div>

          {!initialized || checkingApplication ? (
            <p className={styles.notice} role="status">Checking your account…</p>
          ) : !user ? (
            <div className={styles.notice}>
              <p>Sign in to your O2N account to submit an application. Your account will be used to set up your seller shop if approved.</p>
              <div className={styles.authLinks}>
                <Link className="btn primary" href="/auth/login?next=%2Fseller-application">Sign in</Link>
                <Link className="btn secondary" href="/auth/signup?next=%2Fseller-application">Create an account</Link>
              </div>
            </div>
          ) : existingApplication ? (
            <div className={styles.success} role="status">
              <span className={styles.successIcon} aria-hidden="true">✓</span>
              <div>
                <h2>Application already received</h2>
                <p>You have already applied. Your application is currently <strong>{existingApplication.status}</strong>; O2N team will review it and get back to you shortly.</p>
              </div>
            </div>
          ) : submitted ? (
            <div className={styles.success} role="status">
              <span className={styles.successIcon} aria-hidden="true">✓</span>
              <div>
                <h2>Application submitted</h2>
                <p>You have applied successfully, O2N team will review and will get back to you shortly.</p>
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={submitApplication}>
              <div className={styles.fields}>
                <label>
                  <span className={styles.labelText}>Business / shop name <b aria-hidden="true">*</b></span>
                  <input required maxLength={120} autoComplete="organization" value={fields.businessName} onChange={(event) => updateField("businessName", event.target.value)} />
                </label>
                <label>
                  <span className={styles.labelText}>Contact person <b aria-hidden="true">*</b></span>
                  <input required maxLength={120} autoComplete="name" value={fields.contactName} onChange={(event) => updateField("contactName", event.target.value)} />
                </label>
                <label>
                  <span className={styles.labelText}>Business email <b aria-hidden="true">*</b></span>
                  <input required type="email" maxLength={254} autoComplete="email" value={fields.email} onChange={(event) => updateField("email", event.target.value)} />
                </label>
                <label>
                  <span className={styles.labelText}>Phone number <b aria-hidden="true">*</b></span>
                  <input required type="tel" maxLength={40} autoComplete="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} />
                </label>
                <label className={styles.fullWidth}>
                  <span className={styles.labelText}>Full business address <b aria-hidden="true">*</b></span>
                  <input required maxLength={300} autoComplete="street-address" value={fields.address} onChange={(event) => updateField("address", event.target.value)} />
                </label>
                <label>
                  <span className={styles.labelText}>District / city <b aria-hidden="true">*</b></span>
                  <input required maxLength={120} autoComplete="address-level2" value={fields.district} onChange={(event) => updateField("district", event.target.value)} />
                </label>
                <label>
                  <span className={styles.labelText}>State <b aria-hidden="true">*</b></span>
                  <input required maxLength={120} autoComplete="address-level1" value={fields.state} onChange={(event) => updateField("state", event.target.value)} />
                </label>
                <label className={styles.fullWidth}>
                  <span className={styles.labelText}>Products or services you plan to sell <b aria-hidden="true">*</b></span>
                  <textarea required maxLength={2000} rows={5} value={fields.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Describe your products, brands, or services." />
                </label>
              </div>

              {error ? <p className={styles.error} role="alert">{error}</p> : null}
              <button className={`btn primary ${styles.submit}`} disabled={isSubmitting} type="submit">
                {isSubmitting ? "Submitting application…" : "Submit application"}
              </button>
              <p className={styles.requiredNote}>All fields are required. Each O2N account, email address, and phone number can be used for one application.</p>
            </form>
          )}
          {error && (!user || existingApplication) ? <p className={styles.error} role="alert">{error}</p> : null}
        </section>
      </main>
    </>
  );
}
