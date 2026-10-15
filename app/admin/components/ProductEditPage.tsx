"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { ProductForm } from "./ProductForm";

export function ProductEditPage({ productId }: { productId: string }) {
  const router = useRouter();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  return (
    <>
      {savedMessage ? <div className={styles.alertSuccess} role="status">{savedMessage}</div> : null}
      <ProductForm
        onClose={() => router.push("/admin/products")}
        onCreated={(warning) => setSavedMessage(warning ?? "Product changes saved successfully.")}
        productId={productId}
      />
    </>
  );
}
