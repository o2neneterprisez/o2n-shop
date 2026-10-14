CREATE OR REPLACE FUNCTION public.copy_seller_application_location_to_shop()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$ begin if new.latitude is null or new.longitude is null then select sa.latitude, sa.longitude into new.latitude, new.longitude from public.seller_applications sa where sa.owner_id = new.owner_id and sa.latitude is not null and sa.longitude is not null order by sa.created_at desc limit 1; end if; return new; end; $function$;

GRANT EXECUTE ON FUNCTION "public"."copy_seller_application_location_to_shop"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."copy_seller_application_location_to_shop"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."copy_seller_application_location_to_shop"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."copy_seller_application_location_to_shop"() FROM PUBLIC, "anon", "authenticated";
