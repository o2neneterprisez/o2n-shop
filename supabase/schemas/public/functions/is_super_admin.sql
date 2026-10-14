CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'super_admin'
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_super_admin"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."is_super_admin"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_super_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_super_admin"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."is_super_admin"() FROM PUBLIC, "anon";
