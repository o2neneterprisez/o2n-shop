import type { Metadata } from "next";
import { CategoryManagement } from "../components/CategoryManagement";

export const metadata: Metadata = { title: "Categories | O2N Admin" };

export default function CategoriesPage() {
  return <CategoryManagement />;
}
