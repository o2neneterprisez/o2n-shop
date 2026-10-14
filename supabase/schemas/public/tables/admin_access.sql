CREATE TABLE "public"."admin_access" (
  "user_id"       uuid                     NOT NULL,
  "permissions"   jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "is_active"     boolean                  NOT NULL DEFAULT true,
  "created_by"    uuid,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "job_title"     text                     NOT NULL DEFAULT 'Staff Administrator'::text,
  "employee_code" text,
  CONSTRAINT "admin_access_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "admin_access_permissions_object" CHECK ((jsonb_typeof(permissions) = 'object'::text)),
  CONSTRAINT "admin_access_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "admin_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."admin_access"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin delete staff access" ON "public"."admin_access"
  FOR DELETE
  TO "authenticated"
  USING (public.is_super_admin());

CREATE POLICY "super admin insert staff access" ON "public"."admin_access"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super admin read staff access" ON "public"."admin_access"
  FOR SELECT
  TO "authenticated"
  USING (public.is_super_admin());

CREATE POLICY "super admin update staff access" ON "public"."admin_access"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_access" TO "service_role";

REVOKE ALL ON TABLE "public"."admin_access" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_access" TO "postgres";

REVOKE ALL ON TABLE "public"."admin_access" FROM "anon", "authenticated";
