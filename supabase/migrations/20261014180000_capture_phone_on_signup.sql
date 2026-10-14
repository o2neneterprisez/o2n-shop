CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 insert into public.profiles (id, display_name, phone, avatar_url)
 values (
   new.id,
   nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
   nullif(trim(coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')), ''),
   nullif(new.raw_user_meta_data ->> 'avatar_url', '')
 )
 on conflict (id) do nothing;
 return new;
end;
$function$;
