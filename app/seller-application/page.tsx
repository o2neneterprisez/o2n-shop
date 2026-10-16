import type { Metadata } from "next";
import { SellerApplicationForm } from "@/components/marketplace/SellerApplicationForm";

export const metadata: Metadata = { title: "Apply to sell on O2N" };

export default function SellerApplicationPage() {
  return <SellerApplicationForm />;
}
