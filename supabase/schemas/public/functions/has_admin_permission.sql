CREATE OR REPLACE FUNCTION public.has_admin_permission (
  permission_name text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin')
 or exists(select 1 from public.profiles p join public.admin_access aa on aa.user_id=p.id where p.id=(select auth.uid()) and p.role='admin' and aa.is_active and coalesce((aa.permissions ->> permission_name)::boolean,false));
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_admin_permission"(text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."has_admin_permission"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."has_admin_permission"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."has_admin_permission"(text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."has_admin_permission"(text) FROM PUBLIC, "anon";
