CREATE OR REPLACE FUNCTION public.claim_initial_super_admin()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  current_user_id uuid;
  current_user_email text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'You must be signed in to initialize the administrator';
  end if;
  select lower(u.email) into current_user_email from auth.users u where u.id = current_user_id;
  if current_user_email is distinct from 'o2nenterprisez@gmail.com' then
    raise exception 'Only the designated owner account can initialize the first super administrator';
  end if;
  if exists (select 1 from public.profiles p where p.role = 'super_admin' and p.id <> current_user_id) then
    raise exception 'Super administrator setup has already been completed';
  end if;
  if exists (select 1 from public.profiles p where p.role = 'super_admin' and p.id = current_user_id) then
    raise exception 'This account is already the super administrator';
  end if;
  update public.profiles set role = 'super_admin' where id = current_user_id;
  if not found then
    raise exception 'Profile not found; create your profile before setup';
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."claim_initial_super_admin"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."claim_initial_super_admin"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."claim_initial_super_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."claim_initial_super_admin"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."claim_initial_super_admin"() FROM PUBLIC, "anon";
