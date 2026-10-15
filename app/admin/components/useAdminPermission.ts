"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AdminPermission } from "../types";
import { useAdminContext } from "./AdminContext";

export function useAdminPermission(permission: AdminPermission) {
  const { user } = useAdminContext();
  const [allowed, setAllowed] = useState(user.role === "super_admin");
  const [loading, setLoading] = useState(user.role !== "super_admin" && Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user.role === "super_admin" || !supabase) return;

    let active = true;
    void supabase.rpc("has_admin_permission", { permission_name: permission }).then(({ data, error: permissionError }) => {
      if (!active) return;
      if (permissionError) {
        setError(`Unable to check permission: ${permissionError.message}`);
      } else {
        setAllowed(data === true);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [permission, user.role]);

  return { allowed, loading, error };
}
