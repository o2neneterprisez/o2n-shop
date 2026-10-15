import type { Metadata } from "next";
import { ProductEditPage } from "../../components/ProductEditPage";

export const metadata: Metadata = { title: "Edit product | O2N Admin" };
export const instant = false;

export default async function ProductEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditPage productId={id} />;
}
