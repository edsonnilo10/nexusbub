CREATE TABLE public.quick_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quick messages"
ON public.quick_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own quick messages"
ON public.quick_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own quick messages"
ON public.quick_messages FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own quick messages"
ON public.quick_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_quick_messages_updated_at
BEFORE UPDATE ON public.quick_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_quick_messages_user ON public.quick_messages(user_id);