CREATE OR REPLACE FUNCTION public.current_user_owns_shop (
  target_shop_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.shops s where s.id = target_shop_id and s.owner_id = (select auth.uid()));
$function$;

GRANT EXECUTE ON FUNCTION "public"."current_user_owns_shop"(uuid) TO "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."current_user_owns_shop"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."current_user_owns_shop"(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."current_user_owns_shop"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."current_user_owns_shop"(uuid) TO "postgres";
