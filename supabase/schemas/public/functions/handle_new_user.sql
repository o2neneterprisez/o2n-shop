CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 insert into public.profiles (id, display_name, avatar_url, phone, role, email)
 values (
   new.id,
   nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
   nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
   nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
   case when new.raw_user_meta_data ->> 'account_type' = 'seller' then 'seller' else 'customer' end,
   new.email
 )
 on conflict (id) do nothing;
 return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";
