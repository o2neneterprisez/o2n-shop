"use client";

import { createContext, useContext } from "react";
import type { AdminUser } from "../types";

export type AdminContextValue = {
  user: AdminUser;
  search: string;
  setSearch: (value: string) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminContextProvider = AdminContext.Provider;

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("Admin components must be rendered inside the admin layout.");
  }
  return context;
}
