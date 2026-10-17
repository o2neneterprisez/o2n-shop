CREATE OR REPLACE FUNCTION public.sync_profile_email()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 update public.profiles set email = new.email where id = new.id;
 return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.sync_profile_email() FROM PUBLIC, anon, authenticated;
