import type { Metadata } from "next";
import { ApplicationManagement } from "../components/ApplicationManagement";

export const metadata: Metadata = { title: "Seller Applications | O2N Admin" };

export default function ApplicationsPage() {
  return <ApplicationManagement />;
}
