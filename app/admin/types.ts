export type AdminUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: "admin" | "super_admin";
  avatarUrl: string | null;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  stock_quantity: number;
  status: string;
  created_at: string;
  shop_id: string;
  category_id: string | null;
};

export type Shop = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  district: string | null;
  created_at: string;
  owner_id: string;
};

export type Order = {
  id: string;
  order_number: number;
  shipping_name: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

export type Customer = {
  id: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

export type SellerApplication = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  state: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type AdminPermission =
  | "product_moderation"
  | "shop_moderation"
  | "seller_review";
