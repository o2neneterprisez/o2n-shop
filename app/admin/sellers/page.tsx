import type { Metadata } from "next";
import { SellerManagement } from "../components/SellerManagement";

export const metadata: Metadata = { title: "Sellers | O2N Admin" };

export default function SellersPage() {
  return <SellerManagement />;
}
