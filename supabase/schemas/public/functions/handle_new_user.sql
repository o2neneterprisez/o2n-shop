CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  phone_value text;
begin
 phone_value := nullif(regexp_replace(trim(coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')), '\D', '', 'g'), '');
 if phone_value is not null and phone_value !~ '^[0-9]{10}$' then
   raise exception 'Mobile number must contain exactly 10 digits';
 end if;

 insert into public.profiles (id, display_name, phone, avatar_url)
 values (
   new.id,
   nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
   phone_value,
   nullif(new.raw_user_meta_data ->> 'avatar_url', '')
 )
 on conflict (id) do nothing;
 return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";
