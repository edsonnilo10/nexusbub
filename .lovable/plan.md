

## Implementar `/cursos-planilha` aproveitando o sync existente

### Arquivos

**1. `src/hooks/useCursosResumo.tsx`** (novo)
- `useQuery` com key `["cursos-resumo"]`
- Busca em paralelo: `courses` (id, name, unit, vagas se existir — senão derivar), `enrollments_by_class`, `paid_students`
- Agrega por `course_id` + `unit`:
  - `pagos` = count em `paid_students` com `payment_status` contendo "pago"
  - `pre` = soma de `student_count` de `enrollments_by_class` menos pagos (ou `student_count` total quando não houver match)
  - `total` = pagos + pre
  - `vagas` lida do campo correspondente em `courses` (fallback 0 se nulo)
  - `vagasRestantes` = vagas - total
- Retorna array `CursoResumo[]` tipado localmente no próprio hook
- `staleTime: 5 * 60_000`, `refetchOnWindowFocus: false`
- Expõe também `refetch` para o botão sincronizar

**2. `src/pages/CursosPlanilha.tsx`** (novo)
- `<AppHeader />` no topo + container
- Header da página: título "Cursos (Planilha)" + botão "Sincronizar agora" (chama edge function `sync-google-sheets` via `supabase.functions.invoke`, depois `refetch`, com `toast.success`/`toast.error`)
- 4 Cards de resumo (tokens Nexus: `bg-card`, `text-primary`, `border-primary/20`):
  - Total de Vagas, Pagos, Pré-matriculados, Vagas Restantes
- Filtros: 3 botões (Todos / Brasília / São Paulo) usando `Button` variant `default`/`outline`
- `Input` de busca (filtra por `nome` ou `codigo` localmente)
- `Table` shadcn com colunas: Curso, Unidade, Vagas, Pagos, Pré, Total, Restantes
  - Badge unidade: DF = `secondary`, SP = `default` (com classes para tons accent/gold dos tokens existentes)
  - Badge restantes: `>5` verde (default), `1-5` outline com `text-amber-600`, `<=0` `destructive` "LOTADO"
- `Skeleton` enquanto `isLoading`
- Empty state quando filtro não retorna nada
- Rodapé: "X cursos exibidos · Atualizado a cada 5 minutos"

**3. `src/App.tsx`** (editar)
- Importar `CursosPlanilha`
- Adicionar `<Route path="/cursos-planilha" element={<ProtectedRoute><CursosPlanilha /></ProtectedRoute>} />`

**4. `src/components/AppHeader.tsx`** (editar)
- Importar `TableProperties` do `lucide-react`
- Adicionar no `navItems`: `{ to: "/cursos-planilha", label: "Cursos", icon: TableProperties, adminOnly: false }` entre "Turmas" e "Mensagens"

### O que NÃO será feito

- Sem `fetch-courses` edge function
- Sem `GOOGLE_API_KEY`
- Sem `src/types/curso.ts` paralelo (tipo fica local no hook)
- Sem editar `client.ts` ou `types.ts`
- Sem migrations (RLS já cobre as 3 tabelas usadas)

### Notas técnicas

- Como as tabelas têm RLS por `user_id`, cada usuário aprovado vê apenas o que ele mesmo sincronizou. Isso é coerente com o resto do app.
- O botão "Sincronizar agora" reaproveita a edge function `sync-google-sheets` já existente; não recria pipeline.
- Tons de SP/DF seguem o que já é usado em `UpcomingClassesPanel`/`ClassGroups` para consistência visual.

