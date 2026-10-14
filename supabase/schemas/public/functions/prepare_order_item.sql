CREATE OR REPLACE FUNCTION public.prepare_order_item()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare product_row public.products%rowtype; order_customer uuid;
begin
 select o.customer_id into order_customer from public.orders o where o.id = new.order_id;
 if order_customer is distinct from (select auth.uid()) and not public.is_admin() then
  raise exception 'You may only add items to your own order';
 end if;
 select p.* into product_row from public.products p join public.shops s on s.id = p.shop_id
 where p.id = new.product_id and p.status = 'active' and s.status = 'approved';
 if not found then raise exception 'Product is not available for purchase'; end if;
 if product_row.stock_quantity < new.quantity then raise exception 'Insufficient stock'; end if;
 new.shop_id := product_row.shop_id; new.product_title := product_row.title; new.sku := product_row.sku; new.unit_price := product_row.price;
 return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."prepare_order_item"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."prepare_order_item"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."prepare_order_item"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."prepare_order_item"() FROM PUBLIC, "anon", "authenticated";
