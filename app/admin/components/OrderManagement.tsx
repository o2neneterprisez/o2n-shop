"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Order } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, formatMoney, StatusBadge } from "./AdminUI";

export function OrderManagement() {
  const { search } = useAdminContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, count, error: queryError } = await supabase
      .from("orders")
      .select("id,order_number,shipping_name,status,payment_status,total_amount,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) setError(`Unable to load orders: ${queryError.message}`);
    else {
      setOrders((data ?? []) as Order[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => `${order.order_number} ${order.shipping_name} ${order.status} ${order.payment_status}`.toLowerCase().includes(search.toLowerCase())),
    [orders, search],
  );

  return (
    <>
      <DataError message={error} />
      <DataSection title="Orders" subtitle="Review marketplace orders, payment status, and fulfillment." count={total} onRefresh={() => void loadOrders()}>
        <div className={styles.permissionNote}>
          Order management is read-only because the current database does not grant authenticated order updates.
        </div>
        <div className={styles.tableWrap}>
          <OrdersTable orders={filteredOrders} loading={loading} error={Boolean(error)} />
        </div>
      </DataSection>
    </>
  );
}

function OrdersTable({ orders, loading, error }: { orders: Order[]; loading: boolean; error: boolean }) {
  return (
      <table className={styles.table}>
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Order date</th></tr></thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><strong className={styles.orderNumber}>#{order.order_number}</strong><small className={styles.subCell}>ID {order.id.slice(0, 8)}</small></td>
              <td>{order.shipping_name}</td>
              <td><strong>{formatMoney(Number(order.total_amount))}</strong></td>
              <td><StatusBadge status={order.payment_status} /></td>
              <td><StatusBadge status={order.status} /></td>
              <td>{formatDate(order.created_at)}</td>
            </tr>
          ))}
          {!loading && !orders.length ? <EmptyRow columns={6} label={error ? "Order data could not be loaded." : "No orders match your search."} /> : null}
          {loading ? <EmptyRow columns={6} label="Loading orders…" /> : null}
        </tbody>
      </table>
  );
}
