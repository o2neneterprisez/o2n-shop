CREATE OR REPLACE FUNCTION public.provision_shop_from_approved_application()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  base_slug text;
  final_slug text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    base_slug := trim(both '-' from regexp_replace(lower(coalesce(new.business_name, 'shop')), '[^a-z0-9]+', '-', 'g'));
    if base_slug = '' then base_slug := 'shop'; end if;
    final_slug := left(base_slug, 90) || '-' || left(replace(new.id::text, '-', ''), 8);

    insert into public.shops (
      owner_id, name, slug, contact_email, phone, address, district, state,
      status, latitude, longitude
    ) values (
      new.owner_id, new.business_name, final_slug, new.email, new.phone,
      new.address, new.district, coalesce(nullif(new.state, ''), 'Jharkhand'),
      'approved', new.latitude, new.longitude
    )
    on conflict (slug) do nothing;

    insert into public.profiles (id, display_name, phone, role)
    values (new.owner_id, coalesce(new.contact_name, new.business_name), new.phone, 'seller')
    on conflict (id) do update set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      role = case
        when public.profiles.role in ('admin', 'fse', 'super_admin') then public.profiles.role
        else 'seller'
      end,
      updated_at = now();
  end if;
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."provision_shop_from_approved_application"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."provision_shop_from_approved_application"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."provision_shop_from_approved_application"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."provision_shop_from_approved_application"() FROM PUBLIC, "anon", "authenticated";
