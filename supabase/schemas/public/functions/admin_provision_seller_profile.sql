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

REVOKE ALL ON FUNCTION public.admin_provision_seller_profile(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provision_seller_profile(uuid, text, text) TO authenticated, service_role;
