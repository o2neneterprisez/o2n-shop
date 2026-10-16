"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { SellerDetailsCard } from "./SellerDetailsCard";
import { ShopForm } from "./ShopForm";

export function ShopEditPage({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState("");
  return (
    <>
      {warning ? <div className={styles.alertSuccess} role="status">{warning}</div> : null}
      <div className={styles.shopEditLayout}>
        <ShopForm onClose={() => router.push("/admin/shops")} onOwnerChange={setOwnerId} onSaved={(message) => {
          if (message) {
            setWarning(message);
            return;
          }
          router.push("/admin/shops");
        }} shopId={shopId} />
        <SellerDetailsCard ownerId={ownerId} />
      </div>
    </>
  );
}
