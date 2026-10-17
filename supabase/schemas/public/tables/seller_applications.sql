CREATE TABLE "public"."seller_applications" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"            uuid                     NOT NULL,
  "business_name"       text                     NOT NULL,
  "contact_name"        text,
  "email"               text,
  "phone"               text,
  "address"             text,
  "district"            text,
  "state"               text                     NOT NULL DEFAULT 'Jharkhand'::text,
  "notes"               text,
  "status"              text                     NOT NULL DEFAULT 'pending'::text,
  "reviewed_by"         uuid,
  "reviewed_at"         timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "latitude"            double precision,
  "longitude"           double precision,
  "created_by_staff_id" uuid,
  "logo_url"            text,
  CONSTRAINT "seller_applications_logo_url_check" CHECK (((logo_url IS NULL) OR (char_length(logo_url) <= 1000))),
  CONSTRAINT "seller_applications_business_name_check" CHECK (((length(TRIM(BOTH FROM business_name)) >= 2) AND (length(TRIM(BOTH FROM business_name)) <= 120))),
  CONSTRAINT "seller_applications_created_by_staff_id_fkey" FOREIGN KEY (created_by_staff_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "seller_applications_latitude_range" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))),
  CONSTRAINT "seller_applications_longitude_range" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)))),
  CONSTRAINT "seller_applications_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "seller_applications_pkey" PRIMARY KEY (id),
  CONSTRAINT "seller_applications_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "seller_applications_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE "public"."seller_applications"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX seller_applications_created_by_staff_id_idx ON public.seller_applications USING btree (created_by_staff_id);

CREATE INDEX seller_applications_owner_idx ON public.seller_applications USING btree (owner_id, created_at DESC);

CREATE INDEX seller_applications_reviewed_by_idx ON public.seller_applications USING btree (reviewed_by);

CREATE UNIQUE INDEX seller_applications_owner_unique ON public.seller_applications USING btree (owner_id);

CREATE UNIQUE INDEX seller_applications_email_unique ON public.seller_applications USING btree (lower(btrim(email))) WHERE ((email IS NOT NULL) AND (btrim(email) <> ''::text));

CREATE UNIQUE INDEX seller_applications_phone_unique ON public.seller_applications USING btree (regexp_replace(phone, '\D'::text, ''::text, 'g'::text)) WHERE ((phone IS NOT NULL) AND (regexp_replace(phone, '\D'::text, ''::text, 'g'::text) <> ''::text));

REVOKE INSERT ON TABLE public.seller_applications FROM authenticated;

CREATE TRIGGER seller_application_provision_shop
  AFTER UPDATE OF status ON public.seller_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_shop_from_approved_application();

CREATE POLICY "applications read own or assigned or permitted" ON "public"."seller_applications"
  FOR SELECT
  TO "authenticated"
  USING
    (((owner_id = ( SELECT auth.uid() AS uid)) OR (created_by_staff_id = ( SELECT auth.uid() AS uid)) OR public.has_admin_permission('view_all_sellers'::text) OR
    public.has_admin_permission('seller_review'::text)));

CREATE POLICY "applications submit own pending" ON "public"."seller_applications"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)));

CREATE POLICY "applications update with permission" ON "public"."seller_applications"
  FOR UPDATE
  TO "authenticated"
  USING ((public.has_admin_permission('seller_review'::text) OR public.has_admin_permission('view_all_sellers'::text)))
  WITH CHECK ((public.has_admin_permission('seller_review'::text) OR public.has_admin_permission('view_all_sellers'::text)));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seller_applications" TO "service_role";

REVOKE ALL ON TABLE "public"."seller_applications" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."seller_applications" TO "authenticated";

REVOKE ALL ON TABLE "public"."seller_applications" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seller_applications" TO "postgres";

REVOKE ALL ON TABLE "public"."seller_applications" FROM "anon";
