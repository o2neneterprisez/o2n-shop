CREATE TABLE "public"."shops" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"            uuid                     NOT NULL,
  "name"                text                     NOT NULL,
  "slug"                text                     NOT NULL,
  "description"         text,
  "contact_email"       text,
  "phone"               text,
  "address"             text,
  "district"            text,
  "state"               text                     NOT NULL DEFAULT 'Jharkhand'::text,
  "logo_url"            text,
  "status"              text                     NOT NULL DEFAULT 'pending'::text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "latitude"            double precision,
  "longitude"           double precision,
  "created_by_staff_id" uuid,
  CONSTRAINT "shops_created_by_staff_id_fkey" FOREIGN KEY (created_by_staff_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "shops_latitude_range" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))),
  CONSTRAINT "shops_longitude_range" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)))),
  CONSTRAINT "shops_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120))),
  CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "shops_pkey" PRIMARY KEY (id),
  CONSTRAINT "shops_slug_check" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT "shops_slug_key" UNIQUE (slug),
  CONSTRAINT "shops_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])))
);

ALTER TABLE "public"."shops"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX shops_created_by_staff_id_idx ON public.shops USING btree (created_by_staff_id);

CREATE INDEX shops_owner_idx ON public.shops USING btree (owner_id);

CREATE INDEX shops_status_idx ON public.shops USING btree (status);

CREATE TRIGGER guard_shop_status_changes
  BEFORE UPDATE OF status ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_shop_status_changes();

CREATE TRIGGER shops_copy_application_location
  BEFORE INSERT OR UPDATE OF owner_id, latitude, longitude ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_seller_application_location_to_shop();

CREATE TRIGGER shops_create_trial
  AFTER INSERT OR UPDATE OF status ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_for_approved_shop();

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "shops apply own pending" ON "public"."shops"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)));

CREATE POLICY "shops owner or moderation permission edit" ON "public"."shops"
  FOR UPDATE
  TO "authenticated"
  USING (((owner_id = ( SELECT auth.uid() AS uid)) OR public.has_admin_permission('shop_moderation'::text) OR public.has_admin_permission('view_all_sellers'::text)))
  WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) OR public.has_admin_permission('shop_moderation'::text) OR public.has_admin_permission('view_all_sellers'::text)));

CREATE POLICY "shops public approved read" ON "public"."shops"
  FOR SELECT
  TO "anon"
  USING (((status = 'approved'::text) AND (name <> 'O2N TEST Mobile Shop — NOT REAL'::text)));

CREATE POLICY "shops public owner assigned or permitted" ON "public"."shops"
  FOR SELECT
  TO "authenticated"
  USING
    (((status = 'approved'::text) OR (owner_id = ( SELECT auth.uid() AS uid)) OR (created_by_staff_id = ( SELECT auth.uid() AS uid)) OR
    public.has_admin_permission('view_all_sellers'::text) OR public.has_admin_permission('shop_moderation'::text)));

REVOKE ALL ON TABLE "public"."shops" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shops" TO "service_role";

REVOKE ALL ON TABLE "public"."shops" FROM "anon";

GRANT SELECT ON TABLE "public"."shops" TO "anon";

REVOKE ALL ("address") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("address"), UPDATE ("address") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("contact_email") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("contact_email"), UPDATE ("contact_email") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("description"), UPDATE ("description") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("district") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("district"), UPDATE ("district") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("logo_url") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("logo_url"), UPDATE ("logo_url") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("name"), UPDATE ("name") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("owner_id") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("owner_id") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("phone"), UPDATE ("phone") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("slug") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("slug") ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ("state") ON TABLE "public"."shops" FROM "authenticated";

GRANT INSERT ("state"), UPDATE ("state") ON TABLE "public"."shops" TO "authenticated";

GRANT SELECT ON TABLE "public"."shops" TO "authenticated";

REVOKE ALL ON TABLE "public"."shops" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shops" TO "postgres";
