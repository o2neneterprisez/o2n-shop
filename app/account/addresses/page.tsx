import type { Metadata } from "next";
import { AddressesPage } from "@/components/account/AddressesPage";

export const metadata: Metadata = { title: "My addresses | O2N E-Mall" };

export default function MyAddressesPage() {
  return <AddressesPage />;
}
