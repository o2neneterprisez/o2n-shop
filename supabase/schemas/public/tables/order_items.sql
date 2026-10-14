CREATE TABLE "public"."order_items" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_id"      uuid                     NOT NULL,
  "product_id"    uuid                     NOT NULL,
  "shop_id"       uuid                     NOT NULL,
  "product_title" text                     NOT NULL,
  "sku"           text,
  "quantity"      integer                  NOT NULL,
  "unit_price"    numeric(12,2)            NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "order_items_quantity_check" CHECK (((quantity > 0) AND (quantity <= 100))),
  CONSTRAINT "order_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)),
  CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT,
  CONSTRAINT "order_items_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."order_items"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_items"
  ADD COLUMN "line_total" numeric(12,2) GENERATED ALWAYS AS (((quantity)::numeric * unit_price)) STORED;

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);

CREATE INDEX order_items_product_idx ON public.order_items USING btree (product_id);

CREATE INDEX order_items_shop_idx ON public.order_items USING btree (shop_id);

CREATE TRIGGER order_item_prepare
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_order_item();

CREATE TRIGGER order_item_recalculate
  AFTER INSERT OR DELETE OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_order_totals();

CREATE POLICY "order items customer create" ON "public"."order_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "order items customer seller or admin read" ON "public"."order_items"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_items.shop_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))) OR public.is_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_items" TO "service_role";

REVOKE ALL ON TABLE "public"."order_items" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_items" TO "postgres";

REVOKE ALL ON TABLE "public"."order_items" FROM "anon";
