CREATE OR REPLACE FUNCTION public.admin_provision_staff_profile(
  p_staff_id uuid,
  p_display_name text,
  p_phone text,
  p_role text,
  p_must_change_password boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the super administrator can provision staff profiles';
  END IF;

  IF p_staff_id IS NULL
    OR p_display_name IS NULL
    OR char_length(btrim(p_display_name)) NOT BETWEEN 2 AND 120
    OR (p_phone IS NOT NULL AND p_phone !~ '^[0-9]{10}$')
    OR p_role NOT IN ('admin', 'fse')
  THEN
    RAISE EXCEPTION 'Invalid staff profile details';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_staff_id) THEN
    RAISE EXCEPTION 'Staff account not found';
  END IF;

  INSERT INTO public.profiles (id, display_name, phone, role, must_change_password)
  VALUES (
    p_staff_id,
    btrim(p_display_name),
    NULLIF(btrim(p_phone), ''),
    p_role,
    COALESCE(p_must_change_password, false)
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      must_change_password = COALESCE(p_must_change_password, public.profiles.must_change_password);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_provision_staff_profile(uuid, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provision_staff_profile(uuid, text, text, text, boolean) TO authenticated;
