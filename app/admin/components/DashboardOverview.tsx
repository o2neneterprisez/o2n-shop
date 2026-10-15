"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Order, Product } from "../types";
import styles from "../admin.module.css";
import { DataError, EmptyRow, formatDate, formatMoney, Icon, StatusBadge } from "./AdminUI";

type Overview = {
  orders: Order[];
  products: Product[];
  orderCount: number;
  productCount: number;
  shopCount: number;
  customerCount: number;
};

const EMPTY_OVERVIEW: Overview = {
  orders: [],
  products: [],
  orderCount: 0,
  productCount: 0,
  shopCount: 0,
  customerCount: 0,
};

export function DashboardOverview() {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    if (!supabase) {
      setErrors(["Supabase is not configured."]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [ordersResult, productsResult, shopsResult, customersResult] = await Promise.all([
      supabase.from("orders").select("id,order_number,shipping_name,status,payment_status,total_amount,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("id,title,price,stock_quantity,status,created_at,shop_id,category_id", { count: "exact" }).order("created_at", { ascending: false }).limit(5),
      supabase.from("shops").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    ]);

    const nextErrors = [
      ordersResult.error ? `Orders: ${ordersResult.error.message}` : null,
      productsResult.error ? `Products: ${productsResult.error.message}` : null,
      shopsResult.error ? `Shops: ${shopsResult.error.message}` : null,
      customersResult.error ? `Customers: ${customersResult.error.message}` : null,
    ].filter((message): message is string => Boolean(message));
    setErrors(nextErrors);
    setOverview((current) => ({
      orders: ordersResult.error ? current.orders : (ordersResult.data ?? []) as Order[],
      products: productsResult.error ? current.products : (productsResult.data ?? []) as Product[],
      orderCount: ordersResult.error ? current.orderCount : ordersResult.count ?? 0,
      productCount: productsResult.error ? current.productCount : productsResult.count ?? 0,
      shopCount: shopsResult.error ? current.shopCount : shopsResult.count ?? 0,
      customerCount: customersResult.error ? current.customerCount : customersResult.count ?? 0,
    }));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadOverview(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadOverview]);

  const monthlySales = useMemo(() => {
    const months = Array.from({ length: 8 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - 7 + index);
      return { date, label: new Intl.DateTimeFormat("en", { month: "short" }).format(date), total: 0 };
    });
    for (const order of overview.orders) {
      const date = new Date(order.created_at);
      const month = months.find((item) => item.date.getMonth() === date.getMonth() && item.date.getFullYear() === date.getFullYear());
      if (month) month.total += Number(order.total_amount) || 0;
    }
    return months;
  }, [overview.orders]);

  const chartPoints = useMemo(() => {
    const max = Math.max(1, ...monthlySales.map((item) => item.total));
    return monthlySales.map((item, index) => ({ ...item, x: 40 + index * 100, y: 166 - (item.total / max) * 130 }));
  }, [monthlySales]);

  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const chartArea = `40,166 ${chartLine} 740,166`;
  const recentRevenue = overview.orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
  const lowStockCount = overview.products.filter((product) => product.stock_quantity < 5).length;

  return (
    <>
      <DataError message={errors.length ? errors.join(" · ") : null} />
      {loading ? <div className={styles.loadingBar}><span /></div> : null}
      <div className={styles.statsGrid}>
        <StatCard label="RECENT ORDER REVENUE" value={formatMoney(recentRevenue)} detail="From latest 100 orders" accent="purple" icon="money" />
        <StatCard label="TOTAL ORDERS" value={overview.orderCount.toLocaleString("en-IN")} detail={`${overview.orders.filter((item) => item.status === "pending").length} pending in latest 100`} accent="green" icon="cart" />
        <StatCard label="PRODUCTS" value={overview.productCount.toLocaleString("en-IN")} detail={`${lowStockCount} low stock in latest 5`} accent="blue" icon="products" />
        <StatCard label="CUSTOMERS" value={overview.customerCount.toLocaleString("en-IN")} detail={`${overview.shopCount.toLocaleString("en-IN")} shops on O2N`} accent="orange" icon="customers" />
      </div>

      <div className={styles.dashboardGrid}>
        <section className={`${styles.card} ${styles.salesCard}`}>
          <div className={styles.cardHeading}>
            <div><h2>Sales overview</h2><p>Latest 100 order records · last 8 months</p></div>
            <button className={styles.secondaryButton} onClick={() => void loadOverview()} type="button"><Icon name="clock" size={16} /> Refresh</button>
          </div>
          <div className={styles.chartWrap} role="img" aria-label="Monthly sales chart">
            <div className={styles.chartAxis}>
              <span>{formatMoney(Math.max(1, ...monthlySales.map((item) => item.total)))}</span>
              <span>{formatMoney(Math.max(1, ...monthlySales.map((item) => item.total)) / 2)}</span>
              <span>₹0</span>
            </div>
            <svg className={styles.chart} viewBox="0 0 780 190" preserveAspectRatio="none">
              <defs><linearGradient id="admin-sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6676f4" stopOpacity=".3" /><stop offset="100%" stopColor="#6676f4" stopOpacity=".02" /></linearGradient></defs>
              <path d={`M ${chartArea.replaceAll(" ", " L ")} Z`} fill="url(#admin-sales-fill)" />
              <polyline points={chartLine} fill="none" stroke="#6676f4" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {chartPoints.map((point) => <circle key={point.label + point.date.getFullYear()} cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#6676f4" strokeWidth="3" />)}
            </svg>
            <div className={styles.chartLabels}>{monthlySales.map((item) => <span key={item.label + item.date.getFullYear()}>{item.label}</span>)}</div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.stockCard}`}>
          <div className={styles.cardHeading}><div><h2>Inventory snapshot</h2><p>Products to keep an eye on</p></div></div>
          <div className={styles.stockList}>
            {overview.products.length ? overview.products.map((product, index) => {
              const stock = Number(product.stock_quantity) || 0;
              return <div className={styles.stockRow} key={product.id}><div className={styles.stockMeta}><span>{product.title}</span><small>{stock} in stock</small></div><div className={styles.progressTrack}><span className={styles[`progress${index % 4}`]} style={{ width: `${Math.min(100, Math.max(4, stock))}%` }} /></div></div>;
            }) : <div className={styles.emptyState}><p>{errors.some((message) => message.startsWith("Products:")) ? "Inventory could not be loaded." : "No products are available yet."}</p></div>}
          </div>
        </section>

        <section className={`${styles.card} ${styles.recentCard}`}>
          <div className={styles.cardHeading}><div><h2>Recent orders</h2><p>Latest activity across the marketplace</p></div></div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {overview.orders.slice(0, 5).map((order) => <tr key={order.id}><td><strong className={styles.orderNumber}>#{order.order_number}</strong><small className={styles.subCell}>ID {order.id.slice(0, 8)}</small></td><td>{order.shipping_name}</td><td><strong>{formatMoney(Number(order.total_amount))}</strong></td><td><StatusBadge status={order.payment_status} /></td><td><StatusBadge status={order.status} /></td><td>{formatDate(order.created_at)}</td></tr>)}
                {!overview.orders.length ? <EmptyRow columns={6} label={errors.some((message) => message.startsWith("Orders:")) ? "Order data could not be loaded." : "No orders are available yet."} /> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value, detail, accent, icon }: { label: string; value: string; detail: string; accent: string; icon: string }) {
  return <article className={styles.statCard}><div><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{value}</strong><span className={styles.statDetail}><Icon name="trend" size={14} /> {detail}</span></div><span className={`${styles.statIcon} ${styles[accent]}`}><Icon name={icon} size={25} /></span></article>;
}
