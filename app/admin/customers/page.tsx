import type { Metadata } from "next";
import { CustomerManagement } from "../components/CustomerManagement";

export const metadata: Metadata = { title: "Customers | O2N Admin" };

export default function CustomersPage() {
  return <CustomerManagement />;
}
