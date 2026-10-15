"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Customer } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, StatusBadge } from "./AdminUI";

export function CustomerManagement() {
  const { search } = useAdminContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, count, error: queryError } = await supabase
      .from("profiles")
      .select("id,display_name,role,created_at", { count: "exact" })
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) setError(`Unable to load customers: ${queryError.message}`);
    else {
      setCustomers((data ?? []) as Customer[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCustomers(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCustomers]);

  const filteredCustomers = useMemo(
    () => customers.filter((item) => `${item.display_name ?? ""} ${item.id}`.toLowerCase().includes(search.toLowerCase())),
    [customers, search],
  );

  return (
    <>
      <DataError message={error} />
      <DataSection title="Customers" subtitle="Browse customer accounts on the marketplace." count={total} onRefresh={() => void loadCustomers()}>
        <div className={styles.permissionNote}>Customer accounts are shown for support and reference. Authentication and account deletion remain managed through Supabase Auth.</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Customer</th><th>Account ID</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td><div className={styles.personCell}><span className={styles.customerAvatar}>{(customer.display_name || "C").slice(0, 1).toUpperCase()}</span><strong>{customer.display_name || "Customer"}</strong></div></td>
                  <td><code className={styles.slug}>{customer.id.slice(0, 13)}…</code></td>
                  <td><StatusBadge status={customer.role} /></td>
                  <td>{formatDate(customer.created_at)}</td>
                </tr>
              ))}
              {!loading && !filteredCustomers.length ? <EmptyRow columns={4} label={error ? "Customer data could not be loaded." : "No customers match your search."} /> : null}
              {loading ? <EmptyRow columns={4} label="Loading customers…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
