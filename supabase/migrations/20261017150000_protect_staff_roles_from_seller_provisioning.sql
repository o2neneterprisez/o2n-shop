-- Approving a seller application, or provisioning a seller profile, must never demote a staff
-- account (admin, fse, super_admin) to seller or overwrite an existing profile name.

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

CREATE OR REPLACE FUNCTION public.admin_provision_seller_profile(
  p_seller_id uuid,
  p_display_name text,
  p_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT (
    public.has_admin_permission('seller_review')
    OR public.has_admin_permission('shop_moderation')
  ) THEN
    RAISE EXCEPTION 'Permission denied: seller provisioning';
  END IF;

  IF p_seller_id IS NULL
    OR p_display_name IS NULL
    OR char_length(btrim(p_display_name)) NOT BETWEEN 2 AND 120
    OR char_length(COALESCE(p_phone, '')) > 40
  THEN
    RAISE EXCEPTION 'Invalid seller profile details';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_seller_id) THEN
    RAISE EXCEPTION 'Seller account not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_seller_id AND role IN ('admin', 'fse', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'This account belongs to a staff member and cannot be made a seller';
  END IF;

  INSERT INTO public.profiles (id, display_name, phone, role)
  VALUES (p_seller_id, btrim(p_display_name), NULLIF(btrim(p_phone), ''), 'seller')
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      phone = EXCLUDED.phone,
      role = 'seller';
END;
$function$;
