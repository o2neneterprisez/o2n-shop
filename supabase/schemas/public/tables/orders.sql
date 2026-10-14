CREATE TABLE "public"."orders" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_number"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "customer_id"          uuid                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'pending'::text,
  "payment_status"       text                     NOT NULL DEFAULT 'pending'::text,
  "payment_provider"     text,
  "payment_reference"    text,
  "subtotal"             numeric(12,2)            NOT NULL DEFAULT 0,
  "shipping_amount"      numeric(12,2)            NOT NULL DEFAULT 0,
  "total_amount"         numeric(12,2)            NOT NULL DEFAULT 0,
  "currency"             text                     NOT NULL DEFAULT 'INR'::text,
  "shipping_name"        text                     NOT NULL,
  "shipping_phone"       text                     NOT NULL,
  "shipping_address"     text                     NOT NULL,
  "shipping_district"    text,
  "shipping_state"       text                     NOT NULL DEFAULT 'Jharkhand'::text,
  "shipping_postal_code" text,
  "customer_note"        text,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "orders_currency_check" CHECK ((currency = 'INR'::text)),
  CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "orders_order_number_key" UNIQUE (order_number),
  CONSTRAINT "orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['pending'::text, 'authorized'::text, 'paid'::text, 'failed'::text, 'refunded'::text]))),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_shipping_amount_check" CHECK ((shipping_amount >= (0)::numeric)),
  CONSTRAINT "orders_status_check"
    CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))),
  CONSTRAINT "orders_subtotal_check" CHECK ((subtotal >= (0)::numeric)),
  CONSTRAINT "orders_total_amount_check" CHECK ((total_amount >= (0)::numeric))
);

ALTER TABLE "public"."orders"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX orders_customer_created_idx ON public.orders USING btree (customer_id, created_at DESC);

CREATE POLICY "orders admin update" ON "public"."orders"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders customer create pending" ON "public"."orders"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((customer_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (payment_status = 'pending'::text) AND (subtotal = (0)::numeric) AND (total_amount =
    (0)::numeric)));

CREATE POLICY "orders customer seller or admin read" ON "public"."orders"
  FOR SELECT
  TO "authenticated"
  USING (((customer_id = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.shops s ON ((s.id = oi.shop_id)))
  WHERE ((oi.order_id = orders.id) AND (s.owner_id = ( SELECT auth.uid() AS uid)))))));

REVOKE ALL ON SEQUENCE "public"."orders_order_number_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."orders_order_number_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."orders_order_number_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."orders_order_number_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."orders_order_number_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."orders_order_number_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."orders_order_number_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."orders_order_number_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."orders" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "service_role";

REVOKE ALL ("customer_id") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("customer_id") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("customer_note") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("customer_note") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("shipping_address") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("shipping_address") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("shipping_district") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("shipping_district") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("shipping_name") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("shipping_name") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("shipping_phone") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("shipping_phone") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("shipping_postal_code") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("shipping_postal_code") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("shipping_state") ON TABLE "public"."orders" FROM "authenticated";

GRANT INSERT ("shipping_state") ON TABLE "public"."orders" TO "authenticated";

GRANT SELECT ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ON TABLE "public"."orders" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "postgres";

REVOKE ALL ON TABLE "public"."orders" FROM "anon";
