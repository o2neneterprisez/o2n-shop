import type { Metadata } from "next";
import { StaffManagement } from "../components/StaffManagement";

export const metadata: Metadata = { title: "Staff users | O2N Admin" };

export default function StaffPage() {
  return <StaffManagement />;
}
