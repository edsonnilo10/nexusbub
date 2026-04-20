-- Tabela de auditoria
CREATE TABLE public.approval_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_email text,
  target_name text,
  action text NOT NULL CHECK (action IN ('approved', 'revoked')),
  performed_by uuid,
  performed_by_email text,
  performed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit"
ON public.approval_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Bloqueia inserts/updates/deletes do client (só o trigger SECURITY DEFINER grava)
CREATE POLICY "No direct writes"
ON public.approval_audit
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE INDEX idx_approval_audit_created_at ON public.approval_audit(created_at DESC);

-- Função do trigger
CREATE OR REPLACE FUNCTION public.log_approval_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_email text;
  actor_name text;
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    SELECT email, full_name INTO actor_email, actor_name
    FROM public.profiles WHERE id = actor_id;

    INSERT INTO public.approval_audit (
      target_user_id, target_email, target_name,
      action, performed_by, performed_by_email, performed_by_name
    ) VALUES (
      NEW.id, NEW.email, NEW.full_name,
      CASE WHEN NEW.approved THEN 'approved' ELSE 'revoked' END,
      actor_id, actor_email, actor_name
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_profile_approval_change ON public.profiles;
CREATE TRIGGER log_profile_approval_change
AFTER UPDATE OF approved ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_approval_change();