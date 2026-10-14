import { Suspense } from "react";
import { CategoryProductsPage } from "@/components/marketplace/CategoryProductsPage";

type CategoryRouteProps = {
  params: Promise<{ slug: string }>;
};

async function CategoryRouteContent({ params }: CategoryRouteProps) {
  const { slug } = await params;
  return <CategoryProductsPage slug={slug} />;
}

export default function CategoryRoute({ params }: CategoryRouteProps) {
  return (
    <Suspense fallback={<main className="category-products-main" aria-busy="true" />}>
      <CategoryRouteContent params={params} />
    </Suspense>
  );
}
