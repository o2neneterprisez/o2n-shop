"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { getMarketplaceCategories, type MarketplaceCategory } from "@/lib/supabase/api";

const categoryVisuals = [
  { match: /fashion|clothing|footwear/, style: "fashion", icon: "👕" },
  { match: /grocery|food/, style: "grocery", icon: "🥬" },
  { match: /electronics|mobile|hardware/, style: "tech", icon: "🎧" },
  { match: /home|kitchen/, style: "home", icon: "🛋️" },
  { match: /beauty|personal care/, style: "beauty", icon: "✨" },
];

function getCategoryVisual(name: string) {
  const matchedVisual = categoryVisuals.find(({ match }) => match.test(name.toLowerCase()));
  return matchedVisual ?? { style: "other", icon: "🧺" };
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getMarketplaceCategories()
      .then((rows) => {
        if (!cancelled) {
          setCategories(rows);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Categories could not load.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const parents = categories.filter((category) => !category.parent_id);
  const childrenByParent = new Map<string, MarketplaceCategory[]>();
  categories.forEach((category) => {
    if (!category.parent_id) return;
    const children = childrenByParent.get(category.parent_id) ?? [];
    children.push(category);
    childrenByParent.set(category.parent_id, children);
  });

  return (
    <div className="category-page">
      <MarketplaceHeader />
      <main>
        <section className="category-hero">
          <span className="category-pill">YOUR NEXT GREAT FIND STARTS HERE</span>
          <h1>
            Shop by <em>category.</em>
          </h1>
          <p>Explore thoughtfully curated collections from local shops. Pick a banner and find something you’ll love.</p>
        </section>

        <section className="category-grid" aria-label="Shop all categories">
          <Link className="category-card all" href="/categories/all">
            <span className="category-eyebrow">EXPLORE THE MALL</span>
            <span className="category-icon">✦</span>
            <span className="category-card-title">Everything</span>
            <span className="category-card-sub">Browse all available products</span>
            <span className="category-shop-link">
              Explore collection <b>→</b>
            </span>
          </Link>

          {loading ? <p className="category-message">Loading categories…</p> : null}
          {error ? (
            <div className="category-message category-error" role="alert">
              <p>{error}</p>
              <button type="button" className="category-retry" onClick={() => {
                setLoading(true);
                setAttempt((value) => value + 1);
              }}>
                Try again
              </button>
            </div>
          ) : null}
          {!loading && !error && parents.length === 0 ? (
            <p className="category-message">No active categories are available yet.</p>
          ) : null}

          {!error &&
            parents.map((category) => {
              const children = childrenByParent.get(category.id) ?? [];
              const { style, icon } = getCategoryVisual(category.name);

              return (
                <Link
                  key={category.id}
                  className={`category-card ${style}`}
                  href={`/categories/${encodeURIComponent(category.slug)}`}
                >
                  <span className="category-eyebrow">
                    {children.length ? "CATEGORY & SUBCATEGORIES" : "EXPLORE THE MALL"}
                  </span>
                  <span className="category-icon">{icon}</span>
                  <span className="category-card-title">{category.name}</span>
                  <span className="category-card-sub">{category.description || `Explore ${category.name}`}</span>
                  {children.length ? (
                    <span className="category-children">
                      {children.map((child) => (
                        <span key={child.id}>{child.name}</span>
                      ))}
                    </span>
                  ) : null}
                  <span className="category-shop-link">
                    Explore collection <b>→</b>
                  </span>
                </Link>
              );
            })}
        </section>
      </main>
      <footer className="category-foot">O2N E-Mall · Discover more. Support local.</footer>
    </div>
  );
}
