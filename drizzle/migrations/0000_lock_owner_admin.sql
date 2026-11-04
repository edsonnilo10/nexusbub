CREATE OR REPLACE FUNCTION public.owner_admin_email() RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'edson.nilo10@gmail.com'::text $$;

CREATE OR REPLACE FUNCTION public.is_owner_user(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _uid AND lower(email) = public.owner_admin_email())
$$;
REVOKE EXECUTE ON FUNCTION public.is_owner_user(uuid) FROM PUBLIC, anon;

-- Admin role: only the owner (verified via auth.users email), and only the owner can change roles
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_admin()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role = 'admin' AND NOT public.is_owner_user(NEW.user_id) THEN
    RAISE EXCEPTION 'Apenas % pode ter o papel admin', public.owner_admin_email();
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role = 'admin' AND public.is_owner_user(OLD.user_id) THEN
    RAISE EXCEPTION 'O papel admin do proprietário não pode ser alterado ou removido';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_owner_user(auth.uid())
     AND (TG_OP <> 'INSERT' OR (TG_OP = 'INSERT' AND NEW.role = 'admin')) THEN
    RAISE EXCEPTION 'Apenas o proprietário pode alterar papéis';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_single_admin ON public.user_roles;
CREATE TRIGGER enforce_single_admin BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_admin();

-- Profiles: email immutable from client; owner cannot be revoked
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'O e-mail do perfil não pode ser alterado';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Operação não permitida';
  END IF;
  IF public.is_owner_user(OLD.id) AND NEW.approved = false THEN
    RAISE EXCEPTION 'O acesso do proprietário não pode ser revogado';
  END IF;
  IF NEW.approved IS DISTINCT FROM OLD.approved AND auth.uid() IS NOT NULL AND NOT public.is_owner_user(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o proprietário pode aprovar ou revogar acessos';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();