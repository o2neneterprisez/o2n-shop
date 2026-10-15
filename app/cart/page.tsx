import type { Metadata } from "next";
import { CartPage } from "@/components/marketplace/CartPage";

export const metadata: Metadata = { title: "Your Bag | O2N E-Mall" };

export default function Page() {
  return <CartPage />;
}
