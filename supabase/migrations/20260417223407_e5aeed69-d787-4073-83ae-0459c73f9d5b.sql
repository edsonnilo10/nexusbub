-- Tabela de personalizações por usuário e por curso (WhatsApp + Proposta)
CREATE TABLE public.user_course_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

  -- WhatsApp templates (texto editado pelo usuário; null = usar padrão gerado)
  wa_short text,
  wa_full text,
  wa_followup text,

  -- Proposta (campos editáveis na aba Proposta)
  proposal_price text,
  proposal_start_date date,
  proposal_end_date date,
  proposal_coordinators text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, course_id)
);

-- Índice para busca rápida
CREATE INDEX idx_user_course_overrides_user_course
  ON public.user_course_overrides (user_id, course_id);

-- RLS: cada usuário só enxerga e modifica os próprios overrides
ALTER TABLE public.user_course_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own overrides"
  ON public.user_course_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own overrides"
  ON public.user_course_overrides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own overrides"
  ON public.user_course_overrides FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own overrides"
  ON public.user_course_overrides FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_course_overrides_updated_at
  BEFORE UPDATE ON public.user_course_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();