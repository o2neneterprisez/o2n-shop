CREATE TABLE "public"."product_variants" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "product_id"       uuid                     NOT NULL,
  "sku"              text,
  "options"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "price"            numeric                  NOT NULL,
  "compare_at_price" numeric,
  "stock_quantity"   integer                  NOT NULL DEFAULT 0,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_variants_check" CHECK (((compare_at_price IS NULL) OR (compare_at_price >= price))),
  CONSTRAINT "product_variants_options_object" CHECK ((jsonb_typeof(options) = 'object'::text)),
  CONSTRAINT "product_variants_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_variants_price_check" CHECK ((price >= (0)::numeric)),
  CONSTRAINT "product_variants_stock_quantity_check" CHECK ((stock_quantity >= 0)),
  CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

ALTER TABLE "public"."product_variants"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product variants seller manage own" ON "public"."product_variants"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND (public.current_user_owns_shop(p.shop_id) OR public.is_admin())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND (public.current_user_owns_shop(p.shop_id) OR public.is_admin())))));

CREATE POLICY "product variants visible with product" ON "public"."product_variants"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND (((p.status = 'active'::text) AND (EXISTS ( SELECT 1
           FROM public.shops s
          WHERE ((s.id = p.shop_id) AND (s.status = 'approved'::text))))) OR public.current_user_owns_shop(p.shop_id) OR public.is_admin())))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_variants" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_variants" TO "service_role";

REVOKE ALL ON TABLE "public"."product_variants" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_variants" TO "postgres";
