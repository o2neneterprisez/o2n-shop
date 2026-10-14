CREATE TABLE "public"."product_images" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "product_id" uuid                     NOT NULL,
  "image_url"  text                     NOT NULL,
  "alt_text"   text,
  "sort_order" integer                  NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "media_type" text                     NOT NULL DEFAULT 'image'::text,
  CONSTRAINT "product_images_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text]))),
  CONSTRAINT "product_images_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

ALTER TABLE "public"."product_images"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX product_images_product_idx ON public.product_images USING btree (product_id, sort_order);

CREATE POLICY "product image seller delete" ON "public"."product_images"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.current_user_owns_shop(p.shop_id)))));

CREATE POLICY "product image seller insert" ON "public"."product_images"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.current_user_owns_shop(p.shop_id)))));

CREATE POLICY "product image seller update" ON "public"."product_images"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.current_user_owns_shop(p.shop_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.current_user_owns_shop(p.shop_id)))));

CREATE POLICY "product images visible with product" ON "public"."product_images"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND (((p.status = 'active'::text) AND (EXISTS ( SELECT 1
           FROM public.shops s
          WHERE ((s.id = p.shop_id) AND (s.status = 'approved'::text))))) OR public.current_user_owns_shop(p.shop_id) OR public.is_admin())))));

REVOKE ALL ON TABLE "public"."product_images" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_images" TO "service_role";

REVOKE ALL ON TABLE "public"."product_images" FROM "anon";

GRANT SELECT ON TABLE "public"."product_images" TO "anon";

REVOKE ALL ("alt_text") ON TABLE "public"."product_images" FROM "authenticated";

GRANT INSERT ("alt_text"), UPDATE ("alt_text") ON TABLE "public"."product_images" TO "authenticated";

REVOKE ALL ("image_url") ON TABLE "public"."product_images" FROM "authenticated";

GRANT INSERT ("image_url"), UPDATE ("image_url") ON TABLE "public"."product_images" TO "authenticated";

REVOKE ALL ("product_id") ON TABLE "public"."product_images" FROM "authenticated";

GRANT INSERT ("product_id") ON TABLE "public"."product_images" TO "authenticated";

REVOKE ALL ("sort_order") ON TABLE "public"."product_images" FROM "authenticated";

GRANT INSERT ("sort_order"), UPDATE ("sort_order") ON TABLE "public"."product_images" TO "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."product_images" TO "authenticated";

REVOKE ALL ON TABLE "public"."product_images" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_images" TO "postgres";
