import type { Metadata } from "next";
import { OrderManagement } from "../components/OrderManagement";

export const metadata: Metadata = { title: "Orders | O2N Admin" };

export default function OrdersPage() {
  return <OrderManagement />;
}
