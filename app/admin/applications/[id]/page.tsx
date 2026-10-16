import type { Metadata } from "next";
import { SellerApplicationEditPage } from "../../components/SellerApplicationEditPage";

export const metadata: Metadata = { title: "Edit seller application | O2N Admin" };

export default async function SellerApplicationEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerApplicationEditPage applicationId={id} />;
}
