CREATE OR REPLACE FUNCTION public.admin_create_product(
  p_product jsonb,
  p_variants jsonb DEFAULT '[]'::jsonb,
  p_images jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_product_id uuid;
  v_variant_options jsonb;
BEGIN
  IF NOT public.has_admin_permission('product_moderation') THEN
    RAISE EXCEPTION 'Permission denied: product moderation';
  END IF;

  IF jsonb_typeof(p_product) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Product details must be an object';
  END IF;
  IF jsonb_typeof(p_variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Product variants must be an array';
  END IF;
  IF jsonb_typeof(p_images) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Product images must be an array';
  END IF;

  v_product_id := COALESCE(NULLIF(p_product ->> 'id', '')::uuid, gen_random_uuid());

  INSERT INTO public.products (
    id, shop_id, category_id, title, slug, description, sku, price,
    compare_at_price, stock_quantity, status, brand, condition, warranty,
    return_policy, weight_value, weight_unit, dimensions
  )
  VALUES (
    v_product_id,
    (p_product ->> 'shop_id')::uuid,
    NULLIF(p_product ->> 'category_id', '')::uuid,
    p_product ->> 'title',
    p_product ->> 'slug',
    NULLIF(p_product ->> 'description', ''),
    NULLIF(p_product ->> 'sku', ''),
    (p_product ->> 'price')::numeric,
    NULLIF(p_product ->> 'compare_at_price', '')::numeric,
    COALESCE(NULLIF(p_product ->> 'stock_quantity', '')::integer, 0),
    'pending',
    NULLIF(p_product ->> 'brand', ''),
    COALESCE(NULLIF(p_product ->> 'condition', ''), 'new'),
    NULLIF(p_product ->> 'warranty', ''),
    NULLIF(p_product ->> 'return_policy', ''),
    NULLIF(p_product ->> 'weight_value', '')::numeric,
    NULLIF(p_product ->> 'weight_unit', ''),
    COALESCE(NULLIF(p_product -> 'dimensions', 'null'::jsonb), '{}'::jsonb)
  );

  INSERT INTO public.product_variants (product_id, sku, options, price, compare_at_price, stock_quantity)
  SELECT
    v_product_id,
    NULLIF(variant.sku, ''),
    COALESCE(variant.options, '{}'::jsonb),
    variant.price,
    variant.compare_at_price,
    COALESCE(variant.stock_quantity, 0)
  FROM jsonb_to_recordset(p_variants) AS variant(
    sku text, options jsonb, price numeric, compare_at_price numeric, stock_quantity integer
  );

  INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order)
  SELECT v_product_id, image.image_url, NULLIF(image.alt_text, ''), COALESCE(image.sort_order, 0)
  FROM jsonb_to_recordset(p_images) AS image(image_url text, alt_text text, sort_order integer);

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('name', option_group.name, 'options', option_group.options) ORDER BY option_group.name),
    '[]'::jsonb
  )
  INTO v_variant_options
  FROM (
    SELECT option.name, jsonb_agg(DISTINCT option.value ORDER BY option.value) AS options
    FROM public.product_variants AS variant
    CROSS JOIN LATERAL jsonb_each_text(variant.options) AS option(name, value)
    WHERE variant.product_id = v_product_id
    GROUP BY option.name
  ) AS option_group;

  UPDATE public.products SET variant_options = v_variant_options WHERE id = v_product_id;
  RETURN v_product_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_create_product(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_product(jsonb, jsonb, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
