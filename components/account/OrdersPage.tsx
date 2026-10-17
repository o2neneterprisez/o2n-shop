"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { supabase } from "@/lib/supabase/client";
import styles from "./ProfilePage.module.css";
import orderStyles from "./OrdersPage.module.css";
import { useAccountUser } from "./useAccountUser";

type OrderItem = {
  id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type Order = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  subtotal: number | string;
  shipping_amount: number | string;
  total_amount: number | string;
  created_at: string;
  shipping_name: string;
  shipping_address: string;
  shipping_district: string | null;
  shipping_state: string;
  shipping_postal_code: string | null;
  order_items: OrderItem[];
};

type LoadedOrders =
  | { userId: string; orders: Order[]; error: null }
  | { userId: string; orders: null; error: string };

const STATUS_TONES: Record<string, string> = {
  delivered: "success",
  paid: "success",
  shipped: "info",
  confirmed: "info",
  processing: "info",
  authorized: "info",
  pending: "warning",
  cancelled: "danger",
  refunded: "danger",
  failed: "danger",
};

function money(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatOrderDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`${orderStyles.pill} ${orderStyles[`pill_${STATUS_TONES[status] ?? "neutral"}`]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function OrdersPage() {
  const { user, ready } = useAccountUser();
  const userId = user?.id;
  const [loaded, setLoaded] = useState<LoadedOrders | null>(null);

  useEffect(() => {
    if (!userId || !supabase) return;

    let active = true;
    void supabase
      .from("orders")
      .select("id,order_number,status,payment_status,subtotal,shipping_amount,total_amount,created_at,shipping_name,shipping_address,shipping_district,shipping_state,shipping_postal_code,order_items(id,product_id,product_title,quantity,unit_price,line_total)")
      // Admins can read every order, so always limit this page to the shopper's own orders.
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        setLoaded(error
          ? { userId, orders: null, error: `Unable to load your orders: ${error.message}` }
          : { userId, orders: (data ?? []) as Order[], error: null });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const current = loaded?.userId === userId ? loaded : null;

  return (
    <>
      <MarketplaceHeader />
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>YOUR ACCOUNT</span>
            <h1>My orders</h1>
            <p>Track your orders and see what you bought.</p>
          </div>

          {!ready || (user && !current) ? <p className={styles.notice} role="status">Loading your orders…</p> : null}

          {ready && !user ? (
            <div className={styles.notice}>
              <p>Sign in to see your orders.</p>
              <Link className="btn primary" href="/auth/login?next=%2Faccount%2Forders">Sign in</Link>
            </div>
          ) : null}

          {current?.error ? <p className={styles.error} role="alert">{current.error}</p> : null}

          {current?.orders && !current.orders.length ? (
            <div className={orderStyles.empty}>
              <span aria-hidden="true">🛍️</span>
              <h2>No orders yet</h2>
              <p>When you place an order, it will appear here.</p>
              <Link className="btn primary" href="/">Start shopping</Link>
            </div>
          ) : null}

          {current?.orders?.length ? (
            <ol className={orderStyles.list}>
              {current.orders.map((order) => {
                const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <li className={orderStyles.order} key={order.id}>
                    <div className={orderStyles.orderHead}>
                      <div>
                        <strong>Order #{order.order_number}</strong>
                        <small>Placed {formatOrderDate(order.created_at)} · {itemCount} {itemCount === 1 ? "item" : "items"}</small>
                      </div>
                      <div className={orderStyles.statuses}>
                        <StatusPill status={order.status} />
                        <span className={orderStyles.paymentLabel}>Payment</span>
                        <StatusPill status={order.payment_status} />
                      </div>
                    </div>

                    <ul className={orderStyles.items}>
                      {order.order_items.map((item) => (
                        <li key={item.id}>
                          <Link href={`/products/${encodeURIComponent(item.product_id)}`}>{item.product_title}</Link>
                          <span>{item.quantity} × {money(item.unit_price)}</span>
                          <strong>{money(item.line_total)}</strong>
                        </li>
                      ))}
                    </ul>

                    <div className={orderStyles.orderFoot}>
                      <p>
                        <span>Deliver to</span>
                        {order.shipping_name}, {order.shipping_address}
                        {order.shipping_district ? `, ${order.shipping_district}` : ""}, {order.shipping_state}
                        {order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
                      </p>
                      <dl>
                        <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
                        <div><dt>Delivery</dt><dd>{Number(order.shipping_amount) ? money(order.shipping_amount) : "Free"}</dd></div>
                        <div className={orderStyles.total}><dt>Total</dt><dd>{money(order.total_amount)}</dd></div>
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </section>
      </main>
    </>
  );
}
