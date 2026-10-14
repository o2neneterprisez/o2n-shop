CREATE TABLE "public"."categories" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "slug"        text                     NOT NULL,
  "description" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "parent_id"   uuid,
  "is_active"   boolean                  NOT NULL DEFAULT true,
  CONSTRAINT "categories_name_key" UNIQUE (name),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id),
  CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE RESTRICT,
  CONSTRAINT "categories_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX categories_is_active_idx ON public.categories USING btree (is_active);

CREATE INDEX categories_parent_id_idx ON public.categories USING btree (parent_id);

CREATE POLICY "public read active categories" ON "public"."categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_active = true));

CREATE POLICY "super admin manage categories" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "service_role";

REVOKE ALL ON TABLE "public"."categories" FROM "anon";

GRANT SELECT ON TABLE "public"."categories" TO "anon";

REVOKE ALL ON TABLE "public"."categories" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."categories" TO "authenticated";

REVOKE ALL ON TABLE "public"."categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";
