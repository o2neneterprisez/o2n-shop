import { Suspense } from "react";
import { ProductDetailPage } from "@/components/marketplace/ProductDetailPage";

type ProductRouteProps = {
  params: Promise<{ id: string }>;
};

async function ProductRouteContent({ params }: ProductRouteProps) {
  const { id } = await params;
  return <ProductDetailPage productId={id} />;
}

export default function ProductRoute({ params }: ProductRouteProps) {
  return (
    <Suspense fallback={<main className="productdetail-page" aria-busy="true" />}>
      <ProductRouteContent params={params} />
    </Suspense>
  );
}
