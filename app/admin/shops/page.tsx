import type { Metadata } from "next";
import { ShopManagement } from "../components/ShopManagement";

export const metadata: Metadata = { title: "Shops | O2N Admin" };
export const instant = false;

export default function ShopsPage() {
  return <ShopManagement />;
}
