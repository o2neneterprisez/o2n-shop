import type { Metadata } from "next";
import { OrdersPage } from "@/components/account/OrdersPage";

export const metadata: Metadata = { title: "My orders | O2N E-Mall" };

export default function MyOrdersPage() {
  return <OrdersPage />;
}
