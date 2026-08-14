ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS workload_breakdown text;

COMMENT ON COLUMN public.courses.workload_breakdown IS 'Descrição sucinta da divisão teórica/prática e formato (ex: 10h teóricas + 30h práticas, 1 online + 3 presenciais)';

UPDATE public.courses
SET workload_breakdown = '10h teóricas + 30h práticas (1 aula online síncrona + 3 dias presenciais)'
WHERE mnemonic = 'CM US MESQ' AND unit IN ('sao_paulo', 'brasilia');

GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;