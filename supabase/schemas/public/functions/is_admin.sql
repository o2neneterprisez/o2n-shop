CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists (
   select 1 from public.profiles p
   where p.id = (select auth.uid())
     and p.role in ('admin','super_admin')
 );
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "postgres";
