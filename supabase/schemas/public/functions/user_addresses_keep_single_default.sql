CREATE OR REPLACE FUNCTION public.user_addresses_keep_single_default()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'DELETE' then
    if old.is_default then
      update public.user_addresses set is_default = true
       where id = (
         select a.id from public.user_addresses a
          where a.user_id = old.user_id
          order by a.created_at desc
          limit 1
       );
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' and not exists (select 1 from public.user_addresses a where a.user_id = new.user_id) then
    new.is_default := true;
  end if;
  if new.is_default then
    update public.user_addresses set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.user_addresses_keep_single_default() FROM PUBLIC, anon, authenticated;
