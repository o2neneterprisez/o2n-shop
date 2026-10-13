# Technical Findings and Architecture Review

This document summarizes the current implementation findings from the workspace, with sensitive values redacted and replaced by placeholders to avoid exposing live credentials.

## 1. Project type

The workspace is a Next.js application with a root app structure and a separate raw prototype folder:

- Root project: Next.js 16 app
- Main app entry points: `app/`, `next.config.ts`, `package.json`
- Legacy/prototype assets: `raw/`

The project is currently executable via:

- `npm install`
- `npm run dev`

The running app reports a local address at:

- `http://localhost:3000`

## 2. Raw folder review

The `raw/` directory contains static HTML prototypes used for seller management and shop browsing. It is not the same as the modern Next.js app shell.

Files reviewed:

- `raw/account.html`
- `raw/shops.html`
- `raw/src/index.html`
- `raw/vercel.json`

### 2.1 `raw/account.html`

This file is a seller dashboard and product management page. It contains:

- Authentication UI for login
- Seller/admin role selection
- Shop creation and editing forms
- Product listing and product save flow
- Image upload handling
- Product image storage integration

The HTML includes a Supabase JS bundle from CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

It creates a client using a Supabase project URL and anon/publishable key:

```js
const sb = supabase.createClient(
  "https://[PROJECT-ID].supabase.co",
  "[REDACTED_PUBLISHABLE_KEY]"
);
```

#### Observed data access patterns

The page uses Supabase to interact with several tables and resources:

- `profiles`
- `shops`
- `categories`
- `products`
- `product_images`
- `product-images` storage bucket
- `has_admin_permission` RPC

Examples:

```js
await sb.auth.signInWithPassword({
  email: $("email").value,
  password: $("password").value,
});

await sb.from("profiles").select("role,display_name").eq("id", u.id).maybeSingle();
await sb.from("shops").select(...).eq("owner_id", u.id)
await sb.from("products").select(...).eq("shop_id", sid)
await sb.storage.from("product-images").upload(path, file, {...})
```

### 2.2 `raw/shops.html`

This file is the public shop discovery page.

It contains:

- header/navigation
- search/filter controls
- shop cards with district and product counts
- product grid for selected shops
- QR generation
- share/copy shop link functionality
- shop filtering by status and location

The page creates a direct client connection to Supabase and also reads data via REST query parameters.

```js
const SUPABASE_URL = "https://[PROJECT-ID].supabase.co";
const SUPABASE_KEY = "[REDACTED_PUBLISHABLE_KEY]";
```

It fetches shop data like this:

```js
const qp = new URLSearchParams({
  select: "id,name,slug,description,district,state,logo_url,created_at,status",
  status: "eq.approved",
  name: "neq.O2N TEST Mobile Shop — NOT REAL",
  order: "name.asc"
});

shops = await apiGet("shops", qp, 12000);
```

It also pulls product data and product images using REST endpoints:

```js
const pp = new URLSearchParams({
  select: "id,title,price,compare_at_price,stock_quantity,shop_id,status,created_at",
  shop_id: "in.(...)",
  status: "eq.active",
  stock_quantity: "gt.0",
  order: "created_at.desc"
});
```

This confirms the public storefront is backed by live database read access through Supabase endpoints.

### 2.3 `raw/vercel.json`

This file contains a rewrite rule:

```json
{
  "rewrites": [{
    "source": "/(.*)",
    "destination": "/src/index.html"
  }]
}
```

This is a deployment configuration for serving static HTML from a Vercel-like hosting setup. It does not define a backend or API layer.

## 3. CSS findings

### 3.1 Styling approach

The raw HTML pages use inline CSS only. There are no frameworks like:

- Tailwind
- Bootstrap
- Material UI
- Chakra
- styled-components

The CSS is in a `<style>` block inside each HTML file.

### 3.2 Design system characteristics

The styling uses a custom design language based on:

- dark indigo/purple base colors
- light gray page backgrounds
- white cards and panels
- rounded corners
- simple shadow-less or low-shadow UI
- responsive grids and mobile-friendly layout rules

Examples of color choices:

- primary dark purple: `#211c4d`
- accent blue: `#2457d6`
- light background: `#f5f7fc` / `#f4f7fc`
- neutral text: `#182238`

### 3.3 Observed CSS patterns

The CSS includes common classes such as:

- `.top`
- `.brand`
- `.logo`
- `.nav`
- `.btn`
- `.primary`
- `.hero`
- `.tools`
- `.grid`
- `.shop`
- `.cover`
- `.avatar`
- `.product`
- `.summary`
- `.muted`
- `.view-controls`

This indicates a handcrafted UI system rather than a component library.

### 3.4 Responsive design

Both pages include media queries, especially in `raw/shops.html`:

```css
@media (max-width: 420px) {
  .grid.view-grid { gap: 10px; }
  .grid.view-list .shop { grid-template-columns: 88px minmax(0, 1fr); }
}
```

The layout switches between:

- list view
- grid view
- mobile optimization

### 3.5 Fonts

The site relies on system UI fonts:

```css
font: 16px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
```

This means it is intentionally lightweight and platform-native.

## 4. Supabase connection findings

### 4.1 Confirmed integration

Supabase is definitely connected in the prototype pages.

This is evidenced by:

- CDN script inclusion
- `supabase.createClient(...)` usage
- REST calls against `/rest/v1/...`
- storage uploads to `product-images`
- auth actions using `sb.auth`
- `sb.from(...)` database queries
- `sb.rpc(...)` invocation

### 4.2 Data access model

The application is performing direct browser-side read/write operations against Supabase. This means the browser has access to an anon/publishable key and makes database calls from the client.

Important note:

- This is not a secure server-side secret flow.
- It is a frontend integration pattern common in prototype apps.
- Real production systems should enforce strict RLS policies and avoid exposing privileged logic to the browser.

### 4.3 Table and object usage

The following objects are clearly used by the code:

- `profiles`
- `shops`
- `products`
- `product_images`
- `categories`
- storage bucket: `product-images`
- RPC: `has_admin_permission`

This suggests the data model is being used for:

- user profiles
- seller shops
- product catalog
- product images
- admin role permissions
- category management

### 4.4 Auth and role logic

The seller flow checks the user role before allowing access:

```js
let { data: p, error: pe } = await sb.from("profiles").select("role,display_name").eq("id", u.id).maybeSingle();
```

Then it branches on role:

- `admin`
- `super_admin`
- `fse`
- `seller`

The app also checks permissions via RPC:

```js
await sb.rpc("has_admin_permission", { permission_name: "shop_moderation" });
```

This proves there is some role-based access control logic in the application layer.

## 5. Data flow and functionality

### 5.1 Seller dashboard flow

The flow in `raw/account.html` looks like this:

1. User logs in with email/password.
2. App fetches profile data.
3. It validates role and permission.
4. It loads the user’s shops.
5. It allows adding or editing a shop.
6. It uploads a logo to Supabase Storage.
7. It saves shop metadata to the `shops` table.
8. It loads products for the selected shop.
9. It creates or edits product records.
10. It uploads product media to storage and saves image URLs in `product_images`.

### 5.2 Public storefront flow

The flow in `raw/shops.html` looks like this:

1. Fetch approved shops from `shops` table.
2. Filter by district or search term.
3. Load product counts and product metadata.
4. Render a grid/list of local shops.
5. When selected, load products for one shop.
6. Display product image, title, price, and compare-at price.
7. Generate QR/share links for the selected shop.

### 5.3 Security observations

This architecture is functional for a prototype but has notable security concerns if used in production:

- Frontend contains public database access keys.
- Browser-side fetches expose database structure and operations.
- Auth-sensitive logic is client-side and can be inspected.
- Product and shop editing logic is not protected by a server API in the raw folder.
- RLS and bucket policies must be tightly enforced at the database layer.

## 6. What is likely happening in the project

This looks like a prototype or early-stage marketplace app where:

- a seller portal manages local shops
- a public storefront lists approved shops
- product records and media are stored in Supabase
- authentication and authorization are not yet fully hardened

The architecture appears to be a rapid MVP built with static HTML + JavaScript for the raw front-end, with Supabase as the database and storage backend.

## 7. Redacted secret handling

This document intentionally does not include real secret values.

The following are intentionally masked:

- Supabase project URL
- publishable/anonymous API key
- any access token or private credential

Use placeholders like:

- `https://[PROJECT-ID].supabase.co`
- `[REDACTED_PUBLISHABLE_KEY]`

These placeholders preserve the structure of the implementation without exposing live credentials.

## 8. Risk summary

### High-level findings

- Database integration exists and is active.
- Styling is custom inline CSS, not a framework.
- Public storefront and seller dashboard are implemented in static HTML.
- Supabase is being accessed directly from the browser.
- Sensitive logic is exposed to the client.
- Need stronger backend separation for production use.

### Recommended next steps

1. Move all database writes behind a secure API or server route.
2. Use Supabase service-role keys only in server-side code, never in client bundles.
3. Review row-level security policies for all tables.
4. Restrict storage bucket access to approved authenticated users.
5. Add server validation for product and shop creation.
6. Create a proper production architecture: Next.js routes + Supabase integration + secure auth flows.

## 9. Final conclusion

The project currently contains a working static prototype that uses custom CSS and a direct Supabase connection for both admin and storefront behavior. The code clearly connects to a Supabase project, accesses tables like `shops`, `products`, and `profiles`, and stores media in Supabase Storage.

The implementation is effective as a prototype, but it is not production-hardened because the app relies on direct browser-side access to a public key and database API.

This document intentionally redacts actual secret values while preserving the technical findings in enough detail to understand the architecture and risks.
