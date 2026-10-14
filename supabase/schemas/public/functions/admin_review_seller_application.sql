CREATE OR REPLACE FUNCTION public.admin_review_seller_application (
  target_application_id uuid,
  new_status            text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if not public.has_admin_permission('seller_review') then raise exception 'Permission denied: seller review'; end if;
 if new_status not in ('approved','rejected','pending') then raise exception 'Invalid seller application status'; end if;
 update public.seller_applications set status=new_status, reviewed_by=auth.uid(), reviewed_at=now() where id=target_application_id;
 if not found then raise exception 'Seller application not found'; end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_review_seller_application"(uuid, text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_review_seller_application"(uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_review_seller_application"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_review_seller_application"(uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_review_seller_application"(uuid, text) FROM PUBLIC, "anon";
