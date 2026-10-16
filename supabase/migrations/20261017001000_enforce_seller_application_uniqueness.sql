CREATE UNIQUE INDEX seller_applications_owner_unique
  ON public.seller_applications (owner_id);

CREATE UNIQUE INDEX seller_applications_email_unique
  ON public.seller_applications (lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE UNIQUE INDEX seller_applications_phone_unique
  ON public.seller_applications (regexp_replace(phone, '\D', '', 'g'))
  WHERE phone IS NOT NULL AND regexp_replace(phone, '\D', '', 'g') <> '';

REVOKE INSERT ON TABLE public.seller_applications FROM authenticated;
