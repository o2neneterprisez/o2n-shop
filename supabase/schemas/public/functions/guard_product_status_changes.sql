CREATE OR REPLACE FUNCTION public.guard_product_status_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if new.status is distinct from old.status then
    if public.is_admin() then
      return new;
    end if;
    if not public.current_user_owns_shop(old.shop_id) then
      raise exception 'You can only change status for products in your own shop';
    end if;
    if new.shop_id is distinct from old.shop_id then
      raise exception 'Products cannot be moved to another shop';
    end if;
    if new.status not in ('pending','active','archived') then
      raise exception 'Invalid product status';
    end if;
    if new.status = 'active' and not exists (
      select 1 from public.shops s
      where s.id = new.shop_id
        and s.owner_id = auth.uid()
        and s.status = 'approved'
        and s.name <> 'O2N TEST Mobile Shop — NOT REAL'
    ) then
      raise exception 'Only sellers with an approved shop can publish products';
    end if;
  end if;
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."guard_product_status_changes"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."guard_product_status_changes"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."guard_product_status_changes"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."guard_product_status_changes"() FROM PUBLIC, "anon", "authenticated";
