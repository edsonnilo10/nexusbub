-- Prevent privilege escalation on user_roles via a RESTRICTIVE policy.
-- RESTRICTIVE policies are AND-combined with PERMISSIVE ones, so non-admins
-- (including the row owner) cannot insert/update/delete role rows.

CREATE POLICY "Only admins can modify roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));