CREATE OR REPLACE FUNCTION public.admin_review_shop (
  target_shop_id uuid,
  new_status     text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if not public.has_admin_permission('shop_moderation') then raise exception 'Permission denied: shop moderation'; end if;
 if new_status not in ('approved','rejected','suspended','pending') then raise exception 'Invalid shop status'; end if;
 update public.shops set status=new_status where id=target_shop_id;
 if not found then raise exception 'Shop not found'; end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_review_shop"(uuid, text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_review_shop"(uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_review_shop"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_review_shop"(uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_review_shop"(uuid, text) FROM PUBLIC, "anon";
