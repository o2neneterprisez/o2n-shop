"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { STAFF_PERMISSIONS, STAFF_ROLE_LABELS, type StaffPermission } from "@/lib/admin/staff";
import { supabase } from "@/lib/supabase/client";
import type { AdminUser } from "../types";
import { AdminContextProvider } from "./AdminContext";
import { Icon } from "./AdminUI";
import styles from "../admin.module.css";

// "admin" pages rely on admin-wide database access, so Field Sales Executives never see them.
// Permission pages are shown to an FSE only when that permission is granted.
type NavAccess = "admin" | "super_admin" | StaffPermission;
type NavItem = { href: string; label: string; icon: string; access: NavAccess };

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "OVERVIEW",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", access: "admin" }],
  },
  {
    heading: "MARKETPLACE",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders", access: "admin" },
      { href: "/admin/products", label: "Products", icon: "products", access: "product_moderation" },
      { href: "/admin/shops", label: "Shops", icon: "shops", access: "shop_moderation" },
      { href: "/admin/applications", label: "Seller applications", icon: "applications", access: "seller_review" },
      { href: "/admin/categories", label: "Categories", icon: "categories", access: "admin" },
    ],
  },
  {
    heading: "PEOPLE",
    items: [
      { href: "/admin/sellers", label: "Sellers", icon: "sellers", access: "seller_review" },
      { href: "/admin/customers", label: "Customers", icon: "customers", access: "admin" },
      { href: "/admin/staff", label: "Staff users", icon: "staff", access: "super_admin" },
    ],
  },
];

function canSee(item: NavItem, user: AdminUser) {
  if (item.access === "super_admin") return user.role === "super_admin";
  if (user.role !== "fse") return true;
  return item.access !== "admin" && user.permissions.includes(item.access);
}

function matchesPath(href: string, pathname: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const verifyUser = useCallback(async () => {
    if (!supabase) {
      setError("Admin access is unavailable because Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/auth/login?next=%2Fadmin");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,display_name,avatar_url")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError) {
      setError(`Unable to verify your admin role: ${profileError.message}`);
      setLoading(false);
      return;
    }
    if (!profile || !["admin", "fse", "super_admin"].includes(profile.role)) {
      router.replace("/");
      return;
    }
    let permissions: StaffPermission[] = [];
    if (profile.role === "fse") {
      const client = supabase;
      const checks = await Promise.all(STAFF_PERMISSIONS.map(({ key }) =>
        client.rpc("has_admin_permission", { permission_name: key }).then(({ data }) => (data === true ? key : null)),
      ));
      permissions = checks.filter((key): key is StaffPermission => key !== null);
    }
    setUser({
      id: authData.user.id,
      email: authData.user.email ?? null,
      displayName: profile.display_name ?? authData.user.user_metadata?.full_name ?? authData.user.email ?? "Administrator",
      role: profile.role as AdminUser["role"],
      avatarUrl: profile.avatar_url,
      permissions,
    });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void verifyUser(), 0);
    return () => window.clearTimeout(timeout);
  }, [verifyUser]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch("");
      setSidebarOpen(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  const navGroups = user
    ? NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => canSee(item, user)) })).filter((group) => group.items.length)
    : [];
  const visibleItems = navGroups.flatMap((group) => group.items);
  const homeHref = visibleItems[0]?.href ?? "/admin";
  const pageAllowed = visibleItems.some((item) => matchesPath(item.href, pathname));

  useEffect(() => {
    // Send staff away from pages their role or permissions don't cover.
    if (user && visibleItems.length && !pageAllowed) router.replace(homeHref);
  }, [homeHref, pageAllowed, router, user, visibleItems.length]);

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(`Unable to sign out: ${signOutError.message}`);
      return;
    }
    router.replace("/auth/login");
  }

  if (loading) {
    return <main className={styles.accessState}><span className={styles.spinner} /><p>Verifying administrator access…</p></main>;
  }

  if (!user || !visibleItems.length) {
    return <main className={styles.accessState}><div className={styles.accessCard}><span className={styles.accessMark}>O2N</span><h1>Admin access unavailable</h1><p role="alert">{error ?? (user ? "Your account has no permissions yet. Ask the super administrator to grant access." : "Your account does not have admin access.")}</p><button className={styles.primaryButton} onClick={() => router.replace("/")} type="button">Return to storefront</button></div></main>;
  }

  const title = pathname.startsWith("/admin/products/")
    ? "Products"
    : pathname.startsWith("/admin/shops/")
      ? "Shops"
      : pathname.startsWith("/admin/applications/")
        ? "Seller applications"
      : NAV_GROUPS.flatMap((group) => group.items).find((item) => matchesPath(item.href, pathname))?.label ?? "Dashboard";

  return (
    <AdminContextProvider value={{ user, search, setSearch }}>
      <main className={styles.adminRoot}>
        {sidebarOpen ? <button aria-label="Close navigation" className={styles.mobileBackdrop} onClick={() => setSidebarOpen(false)} type="button" /> : null}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <Link className={styles.brand} href={homeHref}>
            <span className={styles.brandMark}>O<span>2</span>N</span>
            <span className={styles.brandName}>O2N Admin<small>MARKETPLACE CONTROL</small></span>
          </Link>
          <nav className={styles.navigation} aria-label="Admin navigation">
            {navGroups.map((group) => (
              <div className={styles.navGroup} key={group.heading}>
                <p className={styles.navHeading}>{group.heading}</p>
                {group.items.map((item) => (
                  <Link aria-current={matchesPath(item.href, pathname) ? "page" : undefined} className={`${styles.navItem} ${matchesPath(item.href, pathname) ? styles.navItemActive : ""}`} href={item.href} key={item.href} onClick={() => { setSearch(""); setSidebarOpen(false); }}>
                    <Icon name={item.icon} size={18} /><span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className={styles.sidebarBottom}>
            <div className={styles.sidebarHelp}><span className={styles.helpIcon}>?</span><strong>Need a hand?</strong><p>Manage your O2N marketplace from one place.</p></div>
            <Link className={styles.storefrontLink} href="/"><Icon name="arrow" size={16} /> View storefront</Link>
            <span className={styles.version}>O2N E-Mall · Admin</span>
          </div>
        </aside>

        <div className={styles.mainColumn}>
          <header className={styles.topbar}>
            <button className={styles.menuButton} onClick={() => setSidebarOpen((open) => !open)} type="button" aria-label="Toggle navigation"><Icon name={sidebarOpen ? "close" : "menu"} size={22} /></button>
            <label className={styles.searchBox}><Icon name="search" size={19} /><input aria-label={`Search ${title.toLowerCase()}`} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} value={search} /><kbd>⌘ K</kbd></label>
            <div className={styles.topActions}>
              <span className={styles.topDivider} />
              <div className={styles.userMenu}>
                <span className={styles.userAvatar}>{user.avatarUrl ? <Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized /> : user.displayName?.slice(0, 1).toUpperCase() || "A"}</span>
                <span className={styles.userIdentity}><strong>{user.displayName}</strong><small>{STAFF_ROLE_LABELS[user.role]}</small></span>
                <button className={styles.signOutButton} onClick={() => void signOut()} type="button" aria-label="Sign out"><Icon name="logout" size={17} /></button>
              </div>
            </div>
          </header>
          <section className={styles.content}>
            <div className={styles.pageHeading}>
              <div><span className={styles.breadcrumb}>Admin <span>/</span> {title}</span><h1>{title}</h1></div>
              <div className={styles.headingRight}><span className={styles.liveIndicator} /> Live marketplace data</div>
            </div>
            {error ? <div className={styles.alertError} role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError(null)} type="button"><Icon name="close" size={17} /></button></div> : null}
            {pageAllowed ? children : <div className={styles.permissionNote}>You don’t have access to this page. Redirecting…</div>}
            <footer className={styles.footer}><span>© {new Date().getFullYear()} O2N E-Mall</span><span>Marketplace administration</span></footer>
          </section>
        </div>
      </main>
    </AdminContextProvider>
  );
}
