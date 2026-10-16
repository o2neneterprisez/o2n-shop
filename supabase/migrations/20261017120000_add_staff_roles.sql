-- Staff users: adds the Field Sales Executive role and makes admin_access
-- permissions and the active flag apply to every staff member.

ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['customer'::text, 'seller'::text, 'fse'::text, 'admin'::text, 'super_admin'::text]));

-- Admins and FSEs get only the permissions granted in an active admin_access row.
CREATE OR REPLACE FUNCTION public.has_admin_permission (
  permission_name text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin')
 or exists(select 1 from public.profiles p join public.admin_access aa on aa.user_id=p.id where p.id=(select auth.uid()) and p.role in ('admin','fse') and aa.is_active and coalesce((aa.permissions ->> permission_name)::boolean,false));
$function$;

-- A deactivated admin loses broad admin access straight away, even before their session expires.
-- FSEs are deliberately not admins here; they act only through has_admin_permission.
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists (
   select 1 from public.profiles p
   where p.id = (select auth.uid())
     and (
       p.role = 'super_admin'
       or (
         p.role = 'admin'
         and not exists (
           select 1 from public.admin_access aa
           where aa.user_id = p.id and not aa.is_active
         )
       )
     )
 );
$function$;

CREATE OR REPLACE FUNCTION public.clear_own_first_login_flag()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.profiles
     set must_change_password = false,
         updated_at = now()
   where id = auth.uid()
     and role in ('admin','fse','super_admin')
     and must_change_password = true;
  return true;
end;
$function$;

CREATE TRIGGER admin_access_updated_at
  BEFORE UPDATE ON public.admin_access
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
