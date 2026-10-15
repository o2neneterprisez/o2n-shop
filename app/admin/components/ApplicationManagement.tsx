"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SellerApplication } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, StatusBadge, StatusSelect } from "./AdminUI";
import { useAdminPermission } from "./useAdminPermission";

const APPLICATION_STATUSES = ["pending", "approved", "rejected"];

export function ApplicationManagement() {
  const { search } = useAdminContext();
  const { allowed, loading: permissionLoading, error: permissionError } = useAdminPermission("seller_review");
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
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
      .select("id,business_name,contact_name,email,district,status,created_at")
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
    () => applications.filter((item) => `${item.business_name} ${item.contact_name ?? ""} ${item.status}`.toLowerCase().includes(search.toLowerCase())),
    [applications, search],
  );

  async function changeStatus(id: string, status: string) {
    if (!supabase) return;
    setBusyId(id);
    setError(null);
    const { error: actionError } = await supabase.rpc("admin_review_seller_application", {
      target_application_id: id,
      new_status: status,
    });
    if (actionError) setError(`Unable to review seller application: ${actionError.message}`);
    else await loadApplications();
    setBusyId(null);
  }

  return (
    <>
      <DataError message={error ?? permissionError} />
      <DataSection title="Seller applications" subtitle="Review requests from sellers who want to join O2N." count={applications.length} onRefresh={() => void loadApplications()}>
        {!allowed && !permissionLoading ? <div className={styles.permissionNote}>Seller review permission is required to view and process applications.</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Business</th><th>Contact</th><th>Location</th><th>Status</th><th>Submitted</th><th>Decision</th></tr></thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.business_name}</strong><small className={styles.subCell}>ID {application.id.slice(0, 8)}</small></td>
                  <td>{application.contact_name || application.email || "—"}</td>
                  <td>{application.district || "—"}</td>
                  <td><StatusBadge status={application.status} /></td>
                  <td>{formatDate(application.created_at)}</td>
                  <td><StatusSelect current={application.status} options={APPLICATION_STATUSES} disabled={!allowed || busyId === application.id} onChange={(status) => void changeStatus(application.id, status)} /></td>
                </tr>
              ))}
              {!loading && !filteredApplications.length ? <EmptyRow columns={6} label={allowed ? (error ? "Application data could not be loaded." : "No seller applications match your search.") : "No applications available for this admin account."} /> : null}
              {loading || permissionLoading ? <EmptyRow columns={6} label="Loading seller applications…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
