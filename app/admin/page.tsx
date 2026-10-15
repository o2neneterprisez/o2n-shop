import type { Metadata } from "next";
import { DashboardOverview } from "./components/DashboardOverview";

export const metadata: Metadata = {
  title: "Admin Dashboard | O2N E-Mall",
  description: "Manage the O2N marketplace.",
};

export default function AdminPage() {
  return <DashboardOverview />;
}
