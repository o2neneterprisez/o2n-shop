"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SellerApplication } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, Icon, StatusBadge } from "./AdminUI";
import { useAdminPermission } from "./useAdminPermission";

export function ApplicationManagement() {
  const { search } = useAdminContext();
  const { allowed, loading: permissionLoading, error: permissionError } = useAdminPermission("seller_review");
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    if (!allowed) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("seller_applications")
      .select("id,business_name,contact_name,email,phone,address,district,state,notes,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) setError(`Unable to load seller applications: ${queryError.message}`);
    else setApplications((data ?? []) as SellerApplication[]);
    setLoading(false);
  }, [allowed]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadApplications(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadApplications]);

  const filteredApplications = useMemo(
    () => applications.filter((item) => `${item.business_name} ${item.contact_name ?? ""} ${item.email ?? ""} ${item.phone ?? ""} ${item.address ?? ""} ${item.district ?? ""} ${item.state} ${item.notes ?? ""} ${item.status}`.toLowerCase().includes(search.toLowerCase())),
    [applications, search],
  );

  return (
    <>
      <DataError message={error ?? permissionError} />
      <DataSection title="Seller applications" subtitle="Review requests from sellers who want to join O2N." count={applications.length} onRefresh={() => void loadApplications()}>
        {!allowed && !permissionLoading ? <div className={styles.permissionNote}>Seller review permission is required to view and process applications.</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Business</th><th>Contact details</th><th>Location</th><th>Products / services</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.business_name}</strong><small className={styles.subCell}>ID {application.id.slice(0, 8)}</small></td>
                  <td>
                    <strong>{application.contact_name || "—"}</strong>
                    <small className={styles.subCell}>{application.email || "—"}</small>
                    <small className={styles.subCell}>{application.phone || "—"}</small>
                  </td>
                  <td>
                    <span>{application.address || "—"}</span>
                    <small className={styles.subCell}>{[application.district, application.state].filter(Boolean).join(", ") || "—"}</small>
                  </td>
                  <td>{application.notes || "—"}</td>
                  <td><StatusBadge status={application.status} /></td>
                  <td>{formatDate(application.created_at)}</td>
                  <td>
                    <Link className={styles.secondaryButton} href={`/admin/applications/${encodeURIComponent(application.id)}`}>
                      <Icon name="edit" size={15} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !filteredApplications.length ? <EmptyRow columns={7} label={allowed ? (error ? "Application data could not be loaded." : "No seller applications match your search.") : "No applications available for this admin account."} /> : null}
              {loading || permissionLoading ? <EmptyRow columns={7} label="Loading seller applications…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
