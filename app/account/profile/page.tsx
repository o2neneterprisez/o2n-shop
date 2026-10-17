import type { Metadata } from "next";
import { ProfilePage } from "@/components/account/ProfilePage";

export const metadata: Metadata = { title: "My profile | O2N E-Mall" };

export default function MyProfilePage() {
  return <ProfilePage />;
}
