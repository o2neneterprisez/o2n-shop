CREATE OR REPLACE FUNCTION public.recalculate_order_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare target_order uuid;
begin
 target_order := coalesce(new.order_id, old.order_id);
 update public.orders o set
 subtotal = coalesce((select sum(oi.line_total) from public.order_items oi where oi.order_id = target_order), 0),
 total_amount = coalesce((select sum(oi.line_total) from public.order_items oi where oi.order_id = target_order), 0) + o.shipping_amount,
 updated_at = now()
 where o.id = target_order;
 return coalesce(new, old);
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."recalculate_order_totals"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."recalculate_order_totals"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalculate_order_totals"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."recalculate_order_totals"() FROM PUBLIC, "anon", "authenticated";
