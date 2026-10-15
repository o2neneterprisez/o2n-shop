"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { ShopForm } from "./ShopForm";

export function ShopEditPage({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  return (
    <>
      {warning ? <div className={styles.alertSuccess} role="status">{warning}</div> : null}
      <ShopForm onClose={() => router.push("/admin/shops")} onSaved={(message) => {
        if (message) {
          setWarning(message);
          return;
        }
        router.push("/admin/shops");
      }} shopId={shopId} />
    </>
  );
}
