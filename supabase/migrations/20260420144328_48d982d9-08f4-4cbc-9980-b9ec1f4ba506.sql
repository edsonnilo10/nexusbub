-- Garantir que apenas o admin atual (edson.nilo10@gmail.com) possa existir como admin.
-- Esta função bloqueia inserts/updates que tentem promover outros usuários a admin.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_admin_email text := 'edson.nilo10@gmail.com';
  target_email text;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT email INTO target_email FROM public.profiles WHERE id = NEW.user_id;
    IF target_email IS DISTINCT FROM allowed_admin_email THEN
      RAISE EXCEPTION 'Apenas % pode ter o papel admin', allowed_admin_email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_admin ON public.user_roles;
CREATE TRIGGER enforce_single_admin
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_admin();