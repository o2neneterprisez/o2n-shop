CREATE TABLE "public"."profiles" (
  "id"                   uuid                     NOT NULL,
  "display_name"         text,
  "phone"                text,
  "avatar_url"           text,
  "role"                 text                     NOT NULL DEFAULT 'customer'::text,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "must_change_password" boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['customer'::text, 'seller'::text, 'admin'::text, 'super_admin'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "profiles insert own as customer" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) AND (role = 'customer'::text)));

CREATE POLICY "profiles read own or admin" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));

CREATE POLICY "profiles update own or admin" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (((id = ( SELECT auth.uid() AS uid)) OR public.is_admin()))
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

REVOKE ALL ("avatar_url") ON TABLE "public"."profiles" FROM "authenticated";

GRANT INSERT ("avatar_url"), UPDATE ("avatar_url") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("display_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT INSERT ("display_name"), UPDATE ("display_name") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."profiles" FROM "authenticated";

GRANT INSERT ("id") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."profiles" FROM "authenticated";

GRANT INSERT ("phone"), UPDATE ("phone") ON TABLE "public"."profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";
