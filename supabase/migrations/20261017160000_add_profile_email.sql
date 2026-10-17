-- Keeps a read-only copy of each account's sign-in email on its profile.
-- auth.users stays the source of truth; triggers keep the copy in step.
-- Users cannot edit it: authenticated only has column-level UPDATE on display_name, phone and avatar_url.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE u.id = p.id
   AND p.email IS DISTINCT FROM u.email;

-- Same as the current live function, plus the email.
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

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (old.email IS DISTINCT FROM new.email)
  EXECUTE FUNCTION public.sync_profile_email();
