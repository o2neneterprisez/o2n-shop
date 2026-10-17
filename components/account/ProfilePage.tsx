"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { STAFF_ROLE_LABELS } from "@/lib/admin/staff";
import { supabase } from "@/lib/supabase/client";
import { useAppSelector } from "@/lib/store/hooks";
import styles from "./ProfilePage.module.css";

type ProfileRow = {
  display_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

type LoadedProfile =
  | { userId: string; profile: ProfileRow; error: null }
  | { userId: string; profile: null; error: string };

const ROLE_LABELS: Record<string, string> = {
  ...STAFF_ROLE_LABELS,
  customer: "Customer",
  seller: "Seller",
};

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function formatJoined(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

export function ProfilePage() {
  // Sign-in state only exists in the browser, so the server render always shows "loading".
  const isClient = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
  const user = useAppSelector((state) => state.auth.user);
  const initialized = useAppSelector((state) => state.auth.initialized) && isClient;
  const userId = user?.id;
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !supabase) return;

    let active = true;
    void supabase
      .from("profiles")
      .select("display_name,phone,role,created_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError || !data) {
          setLoaded({ userId, profile: null, error: queryError ? `Unable to load your profile: ${queryError.message}` : "Your profile could not be found." });
          return;
        }
        const profile = data as ProfileRow;
        setLoaded({ userId, profile, error: null });
        setDisplayName(profile.display_name ?? "");
        setPhone(profile.phone ?? "");
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const current = loaded?.userId === userId ? loaded : null;
  const profile = current?.profile ?? null;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId) return;
    setMessage(null);
    setError(null);

    const name = displayName.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    if (name.length < 2 || name.length > 120) {
      setError("Enter a name between 2 and 120 characters.");
      return;
    }
    if (phoneDigits && phoneDigits.length !== 10) {
      setError("The mobile number must contain exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: name, phone: phoneDigits || null })
        .eq("id", userId)
        .select("display_name,phone,role,created_at")
        .maybeSingle();
      if (updateError) {
        throw new Error(updateError.code === "23505"
          ? "That mobile number is already used by another account."
          : `Unable to save your profile: ${updateError.message}`);
      }
      if (!data) throw new Error("Your profile could not be updated.");

      // Keep the sign-in record in step so the header shows the new name straight away.
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (metadataError) throw new Error(`Your profile was saved, but your sign-in name could not be updated: ${metadataError.message}`);

      setLoaded({ userId, profile: data as ProfileRow, error: null });
      setDisplayName(name);
      setPhone(phoneDigits);
      setMessage("Your profile has been updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setPasswordMessage(null);
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setChangingPassword(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPasswordError(`Unable to change your password: ${updateError.message}`);
    } else {
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been changed.");
    }
    setChangingPassword(false);
  }

  return (
    <>
      <MarketplaceHeader />
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>YOUR ACCOUNT</span>
            <h1>My profile</h1>
            <p>Update your name and mobile number, or change your password.</p>
          </div>

          {!initialized || (user && !current) ? <p className={styles.notice} role="status">Loading your profile…</p> : null}

          {initialized && !user ? (
            <div className={styles.notice}>
              <p>Sign in to view and edit your profile.</p>
              <Link className="btn primary" href="/auth/login?next=%2Faccount%2Fprofile">Sign in</Link>
            </div>
          ) : null}

          {current?.error ? <p className={styles.error} role="alert">{current.error}</p> : null}

          {user && profile ? (
            <>
              <dl className={styles.summary}>
                <div><dt>Email</dt><dd>{user.email ?? "—"}</dd></div>
                <div><dt>Account type</dt><dd>{ROLE_LABELS[profile.role] ?? profile.role}</dd></div>
                <div><dt>Member since</dt><dd>{formatJoined(profile.created_at)}</dd></div>
              </dl>

              <form className={styles.section} onSubmit={(event) => void saveProfile(event)}>
                <h2>Personal details</h2>
                <div className={styles.fields}>
                  <label>
                    Full name
                    <input autoComplete="name" maxLength={120} minLength={2} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
                  </label>
                  <label>
                    Mobile number <span className={styles.optional}>(optional)</span>
                    <input autoComplete="tel" inputMode="numeric" maxLength={14} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile number" type="tel" value={phone} />
                  </label>
                  <label className={styles.fullWidth}>
                    Email address <span className={styles.optional}>(used to sign in, cannot be changed here)</span>
                    <input disabled type="email" value={user.email ?? ""} />
                  </label>
                </div>
                {error ? <p className={styles.error} role="alert">{error}</p> : null}
                {message ? <p className={styles.success} role="status">{message}</p> : null}
                <button className={`btn primary ${styles.submit}`} disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
              </form>

              <form className={styles.section} onSubmit={(event) => void changePassword(event)}>
                <h2>Change password</h2>
                <div className={styles.fields}>
                  <label>
                    New password
                    <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
                  </label>
                  <label>
                    Confirm new password
                    <input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
                  </label>
                </div>
                {passwordError ? <p className={styles.error} role="alert">{passwordError}</p> : null}
                {passwordMessage ? <p className={styles.success} role="status">{passwordMessage}</p> : null}
                <button className={`btn secondary ${styles.submit}`} disabled={changingPassword} type="submit">{changingPassword ? "Changing…" : "Change password"}</button>
              </form>
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}
