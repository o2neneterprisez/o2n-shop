"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "../admin.module.css";
import { formatDate, formatStatus, Icon, StatusBadge } from "./AdminUI";

type SellerDetails = {
  id: string;
  displayName: string | null;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  email: string | null;
  emailError: string | null;
  shopCount: number | null;
  application: { business_name: string; status: string; created_at: string } | null;
};

type SellerDetailsState =
  | { ownerId: string; details: SellerDetails; error: null }
  | { ownerId: string; details: null; error: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

async function loadSellerEmail(ownerId: string): Promise<{ email: string | null; error: string | null }> {
  if (!supabase) return { email: null, error: "Supabase is not configured." };
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return { email: null, error: `Unable to verify your session: ${sessionError.message}` };
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { email: null, error: "Your session has expired." };

  const response = await fetch(`/api/admin/sellers?id=${encodeURIComponent(ownerId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await response.json() as { seller?: { email: string | null }; error?: string };
  if (!response.ok) return { email: null, error: result.error ?? "Unable to load the account email." };
  return { email: result.seller?.email ?? null, error: null };
}

async function loadSellerDetails(ownerId: string): Promise<SellerDetails> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const [profileResult, shopsResult, applicationResult, emailResult] = await Promise.all([
    supabase.from("profiles").select("id,display_name,role,phone,avatar_url,created_at").eq("id", ownerId).maybeSingle(),
    supabase.from("shops").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase
      .from("seller_applications")
      .select("business_name,status,created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadSellerEmail(ownerId).catch((emailError: unknown) => ({ email: null, error: errorMessage(emailError) })),
  ]);

  if (profileResult.error) throw new Error(`Unable to load the seller profile: ${profileResult.error.message}`);
  if (!profileResult.data) throw new Error("The seller profile could not be found or is not available to your account.");
  const profile = profileResult.data;

  return {
    id: profile.id,
    displayName: profile.display_name,
    role: profile.role,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    email: emailResult.email,
    emailError: emailResult.error,
    shopCount: shopsResult.error ? null : shopsResult.count ?? 0,
    application: applicationResult.error ? null : applicationResult.data,
  };
}

export function SellerDetailsCard({
  ownerId,
  description = "The account that owns this shop.",
  showSellerDirectoryLink = true,
}: {
  ownerId: string;
  description?: string;
  showSellerDirectoryLink?: boolean;
}) {
  const [state, setState] = useState<SellerDetailsState | null>(null);

  useEffect(() => {
    if (!ownerId) return;

    let active = true;
    void loadSellerDetails(ownerId)
      .then((details) => {
        if (active) setState({ ownerId, details, error: null });
      })
      .catch((loadError: unknown) => {
        if (active) setState({ ownerId, details: null, error: errorMessage(loadError) });
      });

    return () => {
      active = false;
    };
  }, [ownerId]);

  const current = state?.ownerId === ownerId ? state : null;
  const seller = current?.details ?? null;
  const name = seller?.displayName || seller?.email || "Unnamed seller";

  return (
    <aside aria-label="Seller details" className={`${styles.card} ${styles.sellerDetailsCard}`}>
      <div className={styles.cardHeading}>
        <div><h2>Seller details</h2><p>{description}</p></div>
      </div>

      {!ownerId ? <p className={styles.sellerDetailsEmpty}>Select a shop owner to see their details.</p> : null}
      {ownerId && !current ? <p className={styles.sellerDetailsEmpty} aria-busy="true">Loading seller details…</p> : null}
      {current?.error ? <p className={styles.formError} role="alert">{current.error}</p> : null}

      {seller ? (
        <>
          <div className={styles.sellerDetailsIdentity}>
            <span className={styles.sellerDetailsAvatar}>
              {seller.avatarUrl
                ? <Image alt="" height={48} src={seller.avatarUrl} unoptimized width={48} />
                : name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{name}</strong>
              <StatusBadge status={seller.role} />
            </div>
          </div>

          <dl className={styles.sellerDetailsList}>
            <div>
              <dt>Email</dt>
              <dd>{seller.email
                ? <a href={`mailto:${seller.email}`}>{seller.email}</a>
                : <span title={seller.emailError ?? undefined}>{seller.emailError ? "Unavailable" : "Not provided"}</span>}
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{seller.phone ? <a href={`tel:${seller.phone}`}>{seller.phone}</a> : "Not provided"}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(seller.createdAt)}</dd>
            </div>
            <div>
              <dt>Shops owned</dt>
              <dd>{seller.shopCount ?? "Unavailable"}</dd>
            </div>
            {seller.application ? (
              <div>
                <dt>Latest application</dt>
                <dd>
                  {seller.application.business_name}
                  <small>{formatStatus(seller.application.status)} · {formatDate(seller.application.created_at)}</small>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Seller ID</dt>
              <dd><code>{seller.id}</code></dd>
            </div>
          </dl>

          {showSellerDirectoryLink ? (
            <Link className={styles.secondaryButton} href="/admin/sellers"><Icon name="sellers" size={15} /> View all sellers</Link>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
