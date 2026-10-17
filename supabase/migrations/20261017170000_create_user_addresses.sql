-- Saved delivery addresses for signed-in users, with an optional map pin.

CREATE TABLE public.user_addresses (
  id            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid                     NOT NULL,
  label         text                     NOT NULL DEFAULT 'Home',
  full_name     text                     NOT NULL,
  phone         text                     NOT NULL,
  address_line1 text                     NOT NULL,
  address_line2 text,
  landmark      text,
  city          text                     NOT NULL,
  state         text                     NOT NULL DEFAULT 'Jharkhand',
  postal_code   text                     NOT NULL,
  latitude      double precision,
  longitude     double precision,
  is_default    boolean                  NOT NULL DEFAULT false,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  updated_at    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_addresses_label_check CHECK (label = ANY (ARRAY['Home'::text, 'Work'::text, 'Other'::text])),
  CONSTRAINT user_addresses_full_name_check CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT user_addresses_phone_check CHECK (phone ~ '^[0-9]{10}$'),
  CONSTRAINT user_addresses_line1_check CHECK (char_length(btrim(address_line1)) BETWEEN 3 AND 200),
  CONSTRAINT user_addresses_line2_check CHECK (address_line2 IS NULL OR char_length(address_line2) <= 200),
  CONSTRAINT user_addresses_landmark_check CHECK (landmark IS NULL OR char_length(landmark) <= 120),
  CONSTRAINT user_addresses_city_check CHECK (char_length(btrim(city)) BETWEEN 2 AND 120),
  CONSTRAINT user_addresses_state_check CHECK (char_length(btrim(state)) BETWEEN 2 AND 120),
  CONSTRAINT user_addresses_postal_code_check CHECK (postal_code ~ '^[1-9][0-9]{5}$'),
  CONSTRAINT user_addresses_location_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

CREATE INDEX user_addresses_user_idx ON public.user_addresses USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX user_addresses_one_default ON public.user_addresses USING btree (user_id) WHERE is_default;

-- Keeps exactly one default address per user: the first address becomes the default,
-- choosing a new default clears the old one, and deleting the default promotes the newest remaining address.
CREATE OR REPLACE FUNCTION public.user_addresses_keep_single_default()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'DELETE' then
    if old.is_default then
      update public.user_addresses set is_default = true
       where id = (
         select a.id from public.user_addresses a
          where a.user_id = old.user_id
          order by a.created_at desc
          limit 1
       );
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' and not exists (select 1 from public.user_addresses a where a.user_id = new.user_id) then
    new.is_default := true;
  end if;
  if new.is_default then
    update public.user_addresses set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.user_addresses_keep_single_default() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER user_addresses_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.user_addresses_keep_single_default();

CREATE TRIGGER user_addresses_promote_default
  AFTER DELETE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.user_addresses_keep_single_default();

CREATE TRIGGER user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses read own or admin" ON public.user_addresses
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "addresses insert own" ON public.user_addresses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "addresses update own" ON public.user_addresses
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "addresses delete own" ON public.user_addresses
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_addresses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_addresses TO authenticated;
GRANT ALL ON TABLE public.user_addresses TO service_role;
