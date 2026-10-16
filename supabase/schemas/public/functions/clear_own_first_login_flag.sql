CREATE OR REPLACE FUNCTION public.clear_own_first_login_flag()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.profiles
     set must_change_password = false,
         updated_at = now()
   where id = auth.uid()
     and role in ('admin','fse','super_admin')
     and must_change_password = true;
  return true;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."clear_own_first_login_flag"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."clear_own_first_login_flag"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."clear_own_first_login_flag"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."clear_own_first_login_flag"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."clear_own_first_login_flag"() FROM PUBLIC, "anon";
