import type { Metadata } from "next";
import { ProductManagement } from "../components/ProductManagement";

export const metadata: Metadata = { title: "Products | O2N Admin" };
export const instant = false;

export default function ProductsPage() {
  return <ProductManagement />;
}
