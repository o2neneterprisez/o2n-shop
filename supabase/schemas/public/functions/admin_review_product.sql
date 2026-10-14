CREATE OR REPLACE FUNCTION public.admin_review_product (
  target_product_id uuid,
  new_status        text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if not public.has_admin_permission('product_moderation') then
   raise exception 'Permission denied: product moderation';
 end if;
 if new_status not in ('active','rejected','archived','pending') then
   raise exception 'Invalid product status';
 end if;
 update public.products set status = new_status, updated_at = now() where id = target_product_id;
 if not found then raise exception 'Product not found'; end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_review_product"(uuid, text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_review_product"(uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_review_product"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_review_product"(uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_review_product"(uuid, text) FROM PUBLIC, "anon";
