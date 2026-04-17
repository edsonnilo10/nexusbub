ALTER TABLE public.user_course_overrides 
ADD COLUMN IF NOT EXISTS proposal_installments integer,
ADD COLUMN IF NOT EXISTS proposal_class_id uuid;