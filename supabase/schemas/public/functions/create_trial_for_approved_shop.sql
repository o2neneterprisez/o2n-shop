CREATE OR REPLACE FUNCTION public.create_trial_for_approved_shop()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
  insert into public.seller_subscriptions (shop_id, plan_code, status, trial_started_at, trial_ends_at)
  values (new.id, 'starter', 'trialing', now(), now() + interval '3 months')
  on conflict (shop_id) do nothing;
 end if;
 return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_trial_for_approved_shop"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_trial_for_approved_shop"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_trial_for_approved_shop"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."create_trial_for_approved_shop"() FROM PUBLIC, "anon", "authenticated";
