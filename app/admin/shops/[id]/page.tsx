import type { Metadata } from "next";
import { ShopEditPage } from "../../components/ShopEditPage";

export const metadata: Metadata = { title: "Edit shop | O2N Admin" };
export const instant = false;

export default async function ShopEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShopEditPage shopId={id} />;
}
