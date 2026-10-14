CREATE TABLE "public"."products" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "shop_id"          uuid                     NOT NULL,
  "category_id"      uuid,
  "title"            text                     NOT NULL,
  "slug"             text                     NOT NULL,
  "description"      text,
  "sku"              text,
  "price"            numeric(12,2)            NOT NULL,
  "compare_at_price" numeric(12,2),
  "stock_quantity"   integer                  NOT NULL DEFAULT 0,
  "status"           text                     NOT NULL DEFAULT 'pending'::text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "brand"            text,
  "attributes"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "variant_options"  jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "condition"        text                     NOT NULL DEFAULT 'new'::text,
  "warranty"         text,
  "return_policy"    text,
  "weight_value"     numeric,
  "weight_unit"      text,
  "dimensions"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT "products_check" CHECK (((compare_at_price IS NULL) OR (compare_at_price >= price))),
  CONSTRAINT "products_pkey" PRIMARY KEY (id),
  CONSTRAINT "products_price_check" CHECK ((price >= (0)::numeric)),
  CONSTRAINT "products_shop_id_sku_key" UNIQUE (shop_id, sku),
  CONSTRAINT "products_shop_id_slug_key" UNIQUE (shop_id, slug),
  CONSTRAINT "products_slug_check" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT "products_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text, 'archived'::text]))),
  CONSTRAINT "products_stock_quantity_check" CHECK ((stock_quantity >= 0)),
  CONSTRAINT "products_title_check" CHECK (((length(TRIM(BOTH FROM title)) >= 2) AND (length(TRIM(BOTH FROM title)) <= 180))),
  CONSTRAINT "products_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE
);

ALTER TABLE "public"."products"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."products"
  ADD CONSTRAINT "products_attributes_object" CHECK ((jsonb_typeof(attributes) = 'object'::text)) NOT VALID;

ALTER TABLE "public"."products"
  ADD CONSTRAINT "products_dimensions_object" CHECK ((jsonb_typeof(dimensions) = 'object'::text)) NOT VALID;

ALTER TABLE "public"."products"
  ADD CONSTRAINT "products_variant_options_array" CHECK ((jsonb_typeof(variant_options) = 'array'::text)) NOT VALID;

CREATE INDEX products_category_idx ON public.products USING btree (category_id);

CREATE INDEX products_search_idx ON public.products USING gin (to_tsvector('simple'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));

CREATE INDEX products_shop_status_idx ON public.products USING btree (shop_id, status);

CREATE TRIGGER guard_product_status_changes
  BEFORE UPDATE OF status ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_status_changes();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "products active approved public or owner or admin" ON "public"."products"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((((status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = products.shop_id) AND (s.status = 'approved'::text))))) OR public.current_user_owns_shop(shop_id) OR public.is_admin()));

CREATE POLICY "products admin delete" ON "public"."products"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "products public approved catalogue read" ON "public"."products"
  FOR SELECT
  TO "anon"
  USING (((status = 'active'::text) AND (stock_quantity > 0) AND public.is_public_approved_shop(shop_id)));

CREATE POLICY "products seller create pending" ON "public"."products"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.current_user_owns_shop(shop_id) AND (status = 'pending'::text)));

CREATE POLICY "products seller edit or admin" ON "public"."products"
  FOR UPDATE
  TO "authenticated"
  USING ((public.current_user_owns_shop(shop_id) OR public.is_admin()))
  WITH
    CHECK
    ((public.is_admin() OR (public.current_user_owns_shop(shop_id) AND (status = ANY (ARRAY['pending'::text, 'active'::text, 'archived'::text])) AND ((status <> 'active'::text) OR
    (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = products.shop_id) AND (s.status = 'approved'::text) AND (s.name <> 'O2N TEST Mobile Shop — NOT REAL'::text))))))));

REVOKE ALL ON TABLE "public"."products" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "service_role";

REVOKE ALL ON TABLE "public"."products" FROM "anon";

GRANT SELECT ON TABLE "public"."products" TO "anon";

REVOKE ALL ("category_id") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("category_id"), UPDATE ("category_id") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("compare_at_price") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("compare_at_price"), UPDATE ("compare_at_price") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("description"), UPDATE ("description") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("price") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("price"), UPDATE ("price") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("shop_id") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("shop_id") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("sku") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("sku"), UPDATE ("sku") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("slug") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("slug"), UPDATE ("slug") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("stock_quantity") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("stock_quantity"), UPDATE ("stock_quantity") ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ("title") ON TABLE "public"."products" FROM "authenticated";

GRANT INSERT ("title"), UPDATE ("title") ON TABLE "public"."products" TO "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ON TABLE "public"."products" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "postgres";
