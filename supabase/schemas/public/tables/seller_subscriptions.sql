CREATE TABLE "public"."seller_subscriptions" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "shop_id"                  uuid                     NOT NULL,
  "plan_code"                text                     NOT NULL DEFAULT 'starter'::text,
  "status"                   text                     NOT NULL DEFAULT 'trialing'::text,
  "trial_started_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "trial_ends_at"            timestamp with time zone NOT NULL DEFAULT (now() + '3 mons'::interval),
  "current_period_start"     timestamp with time zone,
  "current_period_end"       timestamp with time zone,
  "payment_provider"         text,
  "external_subscription_id" text,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "seller_subscriptions_shop_id_key" UNIQUE (shop_id),
  CONSTRAINT "seller_subscriptions_status_check" CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'cancelled'::text, 'expired'::text]))),
  CONSTRAINT "seller_subscriptions_shop_id_fkey" FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE
);

ALTER TABLE "public"."seller_subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX subscriptions_status_trial_idx ON public.seller_subscriptions USING btree (status, trial_ends_at);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.seller_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "subscriptions shop owner or admin read" ON "public"."seller_subscriptions"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = seller_subscriptions.shop_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))) OR public.is_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seller_subscriptions" TO "service_role";

REVOKE ALL ON TABLE "public"."seller_subscriptions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."seller_subscriptions" TO "authenticated";

REVOKE ALL ON TABLE "public"."seller_subscriptions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seller_subscriptions" TO "postgres";

REVOKE ALL ON TABLE "public"."seller_subscriptions" FROM "anon";
