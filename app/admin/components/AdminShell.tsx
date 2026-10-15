"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AdminUser } from "../types";
import { AdminContextProvider } from "./AdminContext";
import { Icon } from "./AdminUI";
import styles from "../admin.module.css";

const NAV_GROUPS = [
  {
    heading: "OVERVIEW",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }],
  },
  {
    heading: "MARKETPLACE",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders" },
      { href: "/admin/products", label: "Products", icon: "products" },
      { href: "/admin/shops", label: "Shops", icon: "shops" },
      { href: "/admin/applications", label: "Seller applications", icon: "applications" },
      { href: "/admin/categories", label: "Categories", icon: "categories" },
    ],
  },
  {
    heading: "PEOPLE",
    items: [{ href: "/admin/customers", label: "Customers", icon: "customers" }],
  },
];

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
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      router.replace("/");
      return;
    }
    setUser({
      id: authData.user.id,
      email: authData.user.email ?? null,
      displayName: profile.display_name ?? authData.user.user_metadata?.full_name ?? authData.user.email ?? "Administrator",
      role: profile.role as AdminUser["role"],
      avatarUrl: profile.avatar_url,
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

  if (!user) {
    return <main className={styles.accessState}><div className={styles.accessCard}><span className={styles.accessMark}>O2N</span><h1>Admin access unavailable</h1><p role="alert">{error ?? "Your account does not have admin access."}</p><button className={styles.primaryButton} onClick={() => router.replace("/")} type="button">Return to storefront</button></div></main>;
  }

  const title = pathname.startsWith("/admin/products/")
    ? "Products"
    : NAV_GROUPS.flatMap((group) => group.items).find((item) => item.href === pathname)?.label ?? "Dashboard";

  return (
    <AdminContextProvider value={{ user, search, setSearch }}>
      <main className={styles.adminRoot}>
        {sidebarOpen ? <button aria-label="Close navigation" className={styles.mobileBackdrop} onClick={() => setSidebarOpen(false)} type="button" /> : null}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <Link className={styles.brand} href="/admin">
            <span className={styles.brandMark}>O<span>2</span>N</span>
            <span className={styles.brandName}>O2N Admin<small>MARKETPLACE CONTROL</small></span>
          </Link>
          <nav className={styles.navigation} aria-label="Admin navigation">
            {NAV_GROUPS.map((group) => (
              <div className={styles.navGroup} key={group.heading}>
                <p className={styles.navHeading}>{group.heading}</p>
                {group.items.map((item) => (
                  <Link aria-current={pathname === item.href ? "page" : undefined} className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ""}`} href={item.href} key={item.href} onClick={() => { setSearch(""); setSidebarOpen(false); }}>
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
                <span className={styles.userIdentity}><strong>{user.displayName}</strong><small>{user.role === "super_admin" ? "Super administrator" : "Administrator"}</small></span>
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
            {children}
            <footer className={styles.footer}><span>© {new Date().getFullYear()} O2N E-Mall</span><span>Marketplace administration</span></footer>
          </section>
        </div>
      </main>
    </AdminContextProvider>
  );
}
