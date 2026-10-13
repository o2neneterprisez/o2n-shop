import { supabase } from "./client";

export type MarketplaceShop = {
  id: string;
  name: string;
  district?: string | null;
  state?: string | null;
  description?: string | null;
  logo_url?: string | null;
  status?: string | null;
  created_at?: string;
};

export type MarketplaceProduct = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  shop_id: string;
  category_id?: string | null;
  category?: string;
  shopName?: string;
  shopDistrict?: string | null;
  shopState?: string | null;
  image?: string | null;
  gallery?: string[];
  warranty?: string | null;
  return_policy?: string | null;
  variant_options?: Array<{ name: string; options: string[] }>;
  created_at?: string;
};

export type ShopDirectoryData = {
  shops: MarketplaceShop[];
  products: MarketplaceProduct[];
};

type ShopRow = {
  id: string;
  name: string;
  district?: string | null;
  state?: string | null;
  description?: string | null;
  logo_url?: string | null;
  status?: string | null;
  created_at?: string;
};

type CategoryRow = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  title: string;
  description?: string | null;
  price: number | string;
  compare_at_price?: number | string | null;
  stock_quantity: number | string;
  shop_id: string;
  category_id?: string | null;
  category?: string | null;
  warranty?: string | null;
  return_policy?: string | null;
  variant_options?: Array<{ name: string; options: string[] }>;
  created_at?: string;
  status?: string;
};

const mockShops: MarketplaceShop[] = [
  {
    id: "shop-1",
    name: "Ranchi Essentials",
    district: "Ranchi",
    state: "Jharkhand",
    description: "Fresh groceries and daily needs for your home.",
    logo_url: "",
    status: "approved",
  },
  {
    id: "shop-2",
    name: "Urban Threads",
    district: "Dhanbad",
    state: "Jharkhand",
    description: "Modern wearables and everyday fashion essentials.",
    logo_url: "",
    status: "approved",
  },
  {
    id: "shop-3",
    name: "Spark Electronics",
    district: "Jamshedpur",
    state: "Jharkhand",
    description: "Gadgets, accessories, and reliable tech support.",
    logo_url: "",
    status: "approved",
  },
];

const mockProducts: MarketplaceProduct[] = [
  {
    id: "prod-1",
    title: "Organic Rice Pack",
    description: "Premium grain pack for family meals.",
    price: 149,
    compare_at_price: 199,
    stock_quantity: 42,
    shop_id: "shop-1",
    category: "Groceries",
    shopName: "Ranchi Essentials",
    shopDistrict: "Ranchi",
    shopState: "Jharkhand",
    image: "https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    ],
    warranty: "Not applicable",
    return_policy: "7-day replacement if damaged",
    variant_options: [{ name: "Sizes", options: ["1kg", "5kg", "10kg"] }],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "prod-2",
    title: "Classic Linen Shirt",
    description: "Comfortable and breathable smart casual shirt.",
    price: 799,
    compare_at_price: 1199,
    stock_quantity: 18,
    shop_id: "shop-2",
    category: "Fashion",
    shopName: "Urban Threads",
    shopDistrict: "Dhanbad",
    shopState: "Jharkhand",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    ],
    warranty: "30-day quality guarantee",
    return_policy: "Easy return within 7 days",
    variant_options: [{ name: "Sizes", options: ["S", "M", "L", "XL"] }],
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "prod-3",
    title: "Wireless Earbuds",
    description: "Bluetooth earbuds with clear stereo sound.",
    price: 1999,
    compare_at_price: 2499,
    stock_quantity: 10,
    shop_id: "shop-3",
    category: "Electronics",
    shopName: "Spark Electronics",
    shopDistrict: "Jamshedpur",
    shopState: "Jharkhand",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80",
    ],
    warranty: "1-year service warranty",
    return_policy: "Replacement available within 10 days",
    variant_options: [{ name: "Colors", options: ["Black", "White", "Blue"] }],
    created_at: "2026-01-03T00:00:00Z",
  },
  {
    id: "prod-4",
    title: "Smart Desk Lamp",
    description: "USB LED lamp with touch controls and warm light.",
    price: 899,
    compare_at_price: 1299,
    stock_quantity: 22,
    shop_id: "shop-1",
    category: "Home",
    shopName: "Ranchi Essentials",
    shopDistrict: "Ranchi",
    shopState: "Jharkhand",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    ],
    warranty: "6-month warranty",
    return_policy: "Buyer protection available",
    variant_options: [{ name: "Finish", options: ["White", "Gold", "Black"] }],
    created_at: "2026-01-04T00:00:00Z",
  },
];

const mapCategory = (categoryId?: string | null, fallback = "Other") => {
  const value = (categoryId ?? fallback).trim().toLowerCase();
  if (["clothing & fashion", "fashion", "footwear"].includes(value)) return "Fashion";
  if (["grocery & food", "groceries", "grocery"].includes(value)) return "Groceries";
  if (["electronics & mobile", "electronics", "electrical & hardware"].includes(value)) return "Electronics";
  if (["home & kitchen", "home & living", "home"].includes(value)) return "Home";
  if (["beauty & personal care", "beauty"].includes(value)) return "Beauty";
  return "Other";
};

export async function getShopDirectoryData(): Promise<ShopDirectoryData> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data: shopsData, error: shopsError } = await supabase
    .from("shops")
    .select("id,name,district,state,description,logo_url,status,created_at")
    .eq("status", "approved")
    .neq("name", "O2N TEST Mobile Shop — NOT REAL")
    .order("name");

  if (shopsError) {
    throw new Error(`Could not load approved shops from Supabase: ${shopsError.message}`);
  }

  const shops = (shopsData ?? []) as ShopRow[];
  if (!shops.length) return { shops, products: [] };

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id,title,description,price,compare_at_price,stock_quantity,shop_id,category_id,variant_options,warranty,return_policy,created_at")
    .in("shop_id", shops.map((shop) => shop.id))
    .eq("status", "active")
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false });

  if (productsError) {
    throw new Error(`Could not load shop products from Supabase: ${productsError.message}`);
  }

  const shopMap = new Map(shops.map((shop) => [shop.id, shop]));
  const productRows = (productsData ?? []) as ProductRow[];
  const productIds = productRows.map((product) => product.id);
  let imageRows: Array<{ product_id: string; image_url: string; sort_order: number }> = [];

  if (productIds.length) {
    const { data, error } = await supabase
      .from("product_images")
      .select("product_id,image_url,sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("Could not load shop product images from Supabase:", error);
    } else {
      imageRows = (data ?? []) as typeof imageRows;
    }
  }

  const imageMap = new Map<string, string[]>();
  for (const row of imageRows) {
    const images = imageMap.get(row.product_id) ?? [];
    images.push(row.image_url);
    imageMap.set(row.product_id, images);
  }

  const products: MarketplaceProduct[] = productRows.map((product) => {
    const productShop = shopMap.get(product.shop_id);
    const gallery = imageMap.get(product.id) ?? [];

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: Number(product.price),
      compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
      stock_quantity: Number(product.stock_quantity),
      shop_id: product.shop_id,
      category_id: product.category_id,
      category: mapCategory(product.category_id ?? undefined),
      shopName: productShop?.name ?? "Unknown shop",
      shopDistrict: productShop?.district ?? null,
      shopState: productShop?.state ?? null,
      image: gallery[0] ?? null,
      gallery,
      warranty: product.warranty ?? "Not specified",
      return_policy: product.return_policy ?? "Check with seller",
      variant_options: Array.isArray(product.variant_options) ? product.variant_options : [],
      created_at: product.created_at,
    };
  });

  return { shops, products };
}

export async function getMarketplaceData() {
  if (!supabase) {
    return {
      shops: mockShops,
      products: mockProducts,
      categories: ["All", "Fashion", "Groceries", "Electronics", "Home", "Beauty", "Other"],
    };
  }

  try {
    const [{ data: shopsData, error: shopsError }, { data: productsData, error: productsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
      supabase.from("shops").select("id,name,district,state,description,logo_url,status,created_at").eq("status", "approved").neq("name", "O2N TEST Mobile Shop — NOT REAL").order("name"),
      supabase.from("products").select("id,title,description,price,compare_at_price,stock_quantity,shop_id,category_id,variant_options,warranty,return_policy,created_at").eq("status", "active").gt("stock_quantity", 0).order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
    ]);

    if (shopsError) throw shopsError;
    if (productsError) throw productsError;
    if (categoriesError) throw categoriesError;

    const shopRows = (shopsData ?? []) as ShopRow[];
    const categoryRows = (categoriesData ?? []) as CategoryRow[];
    const productRows = (productsData ?? []) as ProductRow[];

    const shopMap = new Map(shopRows.map((shop) => [shop.id, shop]));
    const categoryMap = new Map(categoryRows.map((category) => [category.id, category.name]));

    const productImages = await supabase
      .from("product_images")
      .select("product_id,image_url,sort_order")
      .in(
        "product_id",
        productRows.map((product) => product.id)
      )
      .order("sort_order", { ascending: true });

    if (productImages.error) throw productImages.error;

    const imageMap = new Map<string, string[]>();
    const primaryImageMap = new Map<string, string>();

    for (const item of productImages.data ?? []) {
      const existing = imageMap.get(item.product_id) ?? [];
      existing.push(item.image_url);
      imageMap.set(item.product_id, existing);
      if (!primaryImageMap.has(item.product_id)) {
        primaryImageMap.set(item.product_id, item.image_url);
      }
    }

    const properProducts: MarketplaceProduct[] = productRows.map((product) => {
      const shop = shopMap.get(product.shop_id);
      const categoryName = categoryMap.get(product.category_id ?? "") ?? mapCategory(product.category_id ?? undefined, "Other");

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: Number(product.price),
        compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
        stock_quantity: Number(product.stock_quantity),
        shop_id: product.shop_id,
        category_id: product.category_id,
        category: categoryName,
        shopName: shop?.name ?? "Unknown shop",
        shopDistrict: shop?.district ?? null,
        shopState: shop?.state ?? null,
        image: primaryImageMap.get(product.id) ?? null,
        gallery: imageMap.get(product.id) ?? [],
        warranty: product.warranty ?? "Not specified",
        return_policy: product.return_policy ?? "Check with seller",
        variant_options: Array.isArray(product.variant_options) ? product.variant_options : [],
        created_at: product.created_at,
      };
    });

    return {
      shops: shopRows as MarketplaceShop[],
      products: properProducts,
      categories: ["All", ...new Set(categoryRows.map((category) => category.name).concat(["Fashion", "Groceries", "Electronics", "Home", "Beauty", "Other"]))],
    };
  } catch (error) {
    console.error("Failed to load marketplace data from Supabase:", error);
    return {
      shops: mockShops,
      products: mockProducts,
      categories: ["All", "Fashion", "Groceries", "Electronics", "Home", "Beauty", "Other"],
    };
  }
}
