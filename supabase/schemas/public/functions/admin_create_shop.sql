CREATE OR REPLACE FUNCTION public.admin_create_shop(p_shop jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_shop_id uuid;
  v_owner_id uuid;
BEGIN
  IF NOT public.has_admin_permission('shop_moderation') THEN
    RAISE EXCEPTION 'Permission denied: shop moderation';
  END IF;
  IF jsonb_typeof(p_shop) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Shop details must be an object';
  END IF;
  v_owner_id := (p_shop ->> 'owner_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_owner_id AND role = 'seller') THEN
    RAISE EXCEPTION 'Shop owner must be an existing seller';
  END IF;
  INSERT INTO public.shops (
    id, owner_id, name, slug, description, contact_email, phone, address,
    district, state, logo_url, status, latitude, longitude, created_by_staff_id
  )
  VALUES (
    COALESCE(NULLIF(p_shop ->> 'id', '')::uuid, gen_random_uuid()),
    v_owner_id, p_shop ->> 'name', p_shop ->> 'slug',
    NULLIF(p_shop ->> 'description', ''), NULLIF(p_shop ->> 'contact_email', ''),
    NULLIF(p_shop ->> 'phone', ''), NULLIF(p_shop ->> 'address', ''),
    NULLIF(p_shop ->> 'district', ''), COALESCE(NULLIF(p_shop ->> 'state', ''), 'Jharkhand'),
    NULLIF(p_shop ->> 'logo_url', ''), 'pending',
    NULLIF(p_shop ->> 'latitude', '')::double precision,
    NULLIF(p_shop ->> 'longitude', '')::double precision,
    auth.uid()
  )
  RETURNING id INTO v_shop_id;
  RETURN v_shop_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_shop(p_shop_id uuid, p_shop jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_existing_owner_id uuid;
BEGIN
  IF NOT public.has_admin_permission('shop_moderation') THEN
    RAISE EXCEPTION 'Permission denied: shop moderation';
  END IF;
  IF jsonb_typeof(p_shop) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Shop details must be an object';
  END IF;
  v_owner_id := (p_shop ->> 'owner_id')::uuid;
  SELECT owner_id INTO v_existing_owner_id FROM public.shops WHERE id = p_shop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop not found'; END IF;
  IF v_owner_id IS DISTINCT FROM v_existing_owner_id
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_owner_id AND role = 'seller') THEN
    RAISE EXCEPTION 'A new shop owner must be an existing seller';
  END IF;
  UPDATE public.shops
  SET
    owner_id = v_owner_id, name = p_shop ->> 'name', slug = p_shop ->> 'slug',
    description = NULLIF(p_shop ->> 'description', ''),
    contact_email = NULLIF(p_shop ->> 'contact_email', ''),
    phone = NULLIF(p_shop ->> 'phone', ''), address = NULLIF(p_shop ->> 'address', ''),
    district = NULLIF(p_shop ->> 'district', ''),
    state = COALESCE(NULLIF(p_shop ->> 'state', ''), 'Jharkhand'),
    logo_url = NULLIF(p_shop ->> 'logo_url', ''),
    latitude = NULLIF(p_shop ->> 'latitude', '')::double precision,
    longitude = NULLIF(p_shop ->> 'longitude', '')::double precision
  WHERE id = p_shop_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_create_shop(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_shop(jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_update_shop(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_shop(uuid, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
