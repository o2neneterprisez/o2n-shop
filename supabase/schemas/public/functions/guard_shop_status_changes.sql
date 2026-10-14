CREATE OR REPLACE FUNCTION public.guard_shop_status_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only an administrator can change shop status';
  end if;
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."guard_shop_status_changes"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."guard_shop_status_changes"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."guard_shop_status_changes"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."guard_shop_status_changes"() FROM PUBLIC, "anon", "authenticated";
