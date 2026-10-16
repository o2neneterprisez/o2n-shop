export const STAFF_ROLES = ["admin", "fse"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole | "super_admin", string> = {
  super_admin: "Super administrator",
  admin: "Admin",
  fse: "Field Sales Executive",
};

/** Permissions stored as booleans in admin_access.permissions and checked by has_admin_permission(). */
export const STAFF_PERMISSIONS = [
  {
    key: "seller_review",
    label: "Seller review",
    description: "View sellers and review, edit or approve seller applications.",
  },
  {
    key: "shop_moderation",
    label: "Shop moderation",
    description: "Create and edit shops, invite shop owners and change shop status.",
  },
  {
    key: "product_moderation",
    label: "Product moderation",
    description: "Create and edit products and change listing status.",
  },
  {
    key: "view_all_sellers",
    label: "View all sellers",
    description: "See every shop and seller application, not only the ones they created.",
  },
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number]["key"];
export type StaffPermissions = Partial<Record<StaffPermission, boolean>>;

export const DEFAULT_STAFF_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  admin: { seller_review: true, shop_moderation: true, product_moderation: true, view_all_sellers: true },
  fse: { seller_review: true },
};

export type StaffUser = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role: StaffRole | "super_admin";
  job_title: string | null;
  employee_code: string | null;
  permissions: StaffPermissions;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};
