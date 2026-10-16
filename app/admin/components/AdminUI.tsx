"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import styles from "../admin.module.css";

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="15" width="7" height="6" rx="1.5" /></>,
    orders: <><path d="M4 5h16v15H4z" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" /></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    shops: <><path d="M3 10h18l-1.5-6h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /><path d="M3 10c0 1.7 2.5 2.3 3.5.7 1 1.6 3.5 1 3.5-.7 0 1.7 2.5 2.3 3.5.7 1 1.6 3.5 1 3.5-.7 0 1.7 2.5 2.3 3.5.7" /></>,
    applications: <><path d="M8 4h8M9 3h6v3H9z" /><rect x="5" y="5" width="14" height="16" rx="2" /><path d="m8 13 2 2 5-5" /></>,
    categories: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>,
    staff: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="m16 11 2 2 4-4" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6" /></>,
    sellers: <><path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 2 18.5V20" /><circle cx="9" cy="7" r="4" /><path d="M16 11a4 4 0 0 0 0-8M17 14h1a4 4 0 0 1 4 4v2" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.7" /><path d="m16 16 5 5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    money: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 9v6M15 11a3 3 0 0 0-6 0c0 2 6 1 6 3a3 3 0 0 1-6 0" /></>,
    cart: <><path d="M3 4h2l2.2 11.5a2 2 0 0 0 2 1.5h8.5a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15v5Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? paths.dashboard}
    </svg>
  );
}

/** Square list thumbnail that falls back to the name's first letter when there is no image. */
export function Thumbnail({ src, name }: { src: string | null | undefined; name: string }) {
  return (
    <span className={styles.listThumbnail}>
      {src ? <Image alt="" height={40} src={src} unoptimized width={40} /> : name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(" ", "_");
  const kind = ["active", "approved", "paid", "delivered"].includes(normalized)
    ? "success"
    : ["pending", "processing", "authorized", "confirmed"].includes(normalized)
      ? "warning"
      : ["rejected", "suspended", "cancelled", "failed", "refunded", "archived", "hidden", "deactivated"].includes(normalized)
        ? "danger"
        : "neutral";
  return <span className={`${styles.statusBadge} ${styles[`status${kind}`]}`}><i />{formatStatus(status)}</span>;
}

export function StatusSelect({ current, options, disabled, onChange }: { current: string; options: string[]; disabled?: boolean; onChange: (status: string) => void }) {
  return (
    <select aria-label={`Change status from ${formatStatus(current)}`} className={styles.statusSelect} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={current}>
      {options.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
    </select>
  );
}

export function DataSection({ title, subtitle, count, onRefresh, action, children }: { title: string; subtitle: string; count: number; onRefresh: () => void; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.managementCard}>
      <div className={styles.managementHeading}>
        <div><div className={styles.tableTitleLine}><h2>{title}</h2><span className={styles.totalBadge}>{count.toLocaleString("en-IN")}</span></div><p>{subtitle}</p></div>
        <div className={styles.managementActions}><button className={styles.secondaryButton} onClick={onRefresh} type="button"><Icon name="clock" size={16} /> Refresh</button>{action}</div>
      </div>
      {children}
    </section>
  );
}

export function DataError({ message }: { message: string | null }) {
  return message ? <div className={styles.alertError} role="alert"><span>{message}</span></div> : null;
}

export function TableLoading({ loading, columns }: { loading: boolean; columns: number }) {
  if (!loading) return null;
  return <tr><td className={styles.emptyCell} colSpan={columns}><div className={styles.emptyState}>Loading…</div></td></tr>;
}

export function EmptyRow({ columns, label }: { columns: number; label: string }) {
  return <tr><td className={styles.emptyCell} colSpan={columns}><div className={styles.emptyState}><span><Icon name="search" size={20} /></span><p>{label}</p></div></td></tr>;
}
