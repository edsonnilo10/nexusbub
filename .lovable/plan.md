## Objetivo

Reduzir o bundle inicial do `/auth` (e demais entradas) com `React.lazy` em 14 páginas, e proteger contra "tela branca" em deploys novos com um `RouteErrorBoundary` específico para erros de chunk do Vite.

---

## Mudanças

### 1) Novo arquivo: `src/components/RouteErrorBoundary.tsx`

Class component que envolve o `<Suspense>` e captura erros de render + falhas de import dinâmico.

**Detecção robusta de chunk error** (cobre Vite e Webpack):
```ts
const isChunkError = (error: Error) =>
  error.name === "ChunkLoadError" ||
  /loading chunk|failed to fetch dynamically imported module/i.test(error.message);
```

**Reset correto** (libera o boundary após clique em "Tentar novamente"):
```ts
handleReset = () => this.setState({ hasError: false, error: null });
```

**Logging condicional** (evita duplicar com o log nativo do React em dev):
```ts
componentDidCatch(error, info) {
  if (import.meta.env.PROD) console.error("[RouteErrorBoundary]", error, info);
}
```

**UI de fallback** (dois caminhos):
- **Chunk error** → Card "Nova versão disponível. Recarregue a página." + botão `Recarregar` (chama `window.location.reload()`).
- **Erro genérico** → Card "Algo deu errado." + botões `Tentar novamente` (handleReset) e `Voltar ao início` (`window.location.href = "/"`).

Estilo consistente com o resto do app (Card + Button do shadcn, ícone `AlertCircle` do lucide).

### 2) Refator `src/App.tsx`

**Imports lazy** (14 páginas):
```ts
const Index = lazy(() => import("./pages/Index"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminApprovals = lazy(() => import("./pages/AdminApprovals"));
const AdminAudit = lazy(() => import("./pages/AdminAudit"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const ImportCourses = lazy(() => import("./pages/ImportCourses"));
const Settings = lazy(() => import("./pages/Settings"));
const CourseCalendar = lazy(() => import("./pages/CourseCalendar"));
const ClassGroups = lazy(() => import("./pages/ClassGroups"));
const GlobalDashboard = lazy(() => import("./pages/GlobalDashboard"));
const QuickMessages = lazy(() => import("./pages/QuickMessages"));
const CursosPlanilha = lazy(() => import("./pages/CursosPlanilha"));
```

**Imports estáticos** (intencionais):
- `Auth` — entrada principal de usuários deslogados, não pode ter latência de chunk.
- `NotFound` — leve, e precisa estar sempre disponível como fallback do catch-all.

**PageLoader inline** (mesma estética do loader do `ProtectedRoute`):
```tsx
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);
```

**Hierarquia dentro de `AuthProvider`**:
```
<AuthProvider>
  <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        ... 16 rotas ...
      </Routes>
    </Suspense>
  </RouteErrorBoundary>
</AuthProvider>
```

**Preservação integral**:
- Todos os providers atuais: `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner`, `BrowserRouter`, `AuthProvider`.
- Todas as 16 rotas atuais com suas guardas (`ProtectedRoute`, `adminOnly`).
- `ProtectedRoute` continua importado como **named export** (`import { ProtectedRoute } from "@/components/ProtectedRoute"`).
- Catch-all `<Route path="*" element={<NotFound />} />` permanece como **última rota** dentro de `<Routes>`.

---

## Tabela de riscos cobertos

| Risco | Mitigação |
|---|---|
| Tela branca em deploy novo (chunk antigo no cache) | `RouteErrorBoundary` detecta e oferece reload |
| Boundary preso após clicar "Tentar novamente" | `handleReset` limpa `hasError` e `error` |
| Log duplicado de erro em dev | `if (import.meta.env.PROD)` antes do `console.error` |
| Latência adicional no `/auth` | `Auth` permanece estático |
| Flash visual entre loader de auth e loader de chunk | `PageLoader` usa o mesmo `Loader2` + layout do `ProtectedRoute` |
| String fragil para detectar chunk error | Regex case-insensitive cobre Vite + Webpack |
| Catch-all reordenado pelo refator | Spec explícita: `*` é a última rota |

---

## Validação pós-aplicação

1. `/auth` carrega e o Network mostra **apenas** o chunk principal + `Auth` + vendors (sem `Dashboard`, `CourseEditor` etc).
2. Navegar para `/dashboard` dispara um chunk novo e o `PageLoader` aparece brevemente.
3. Build de produção (`vite build`) e checar `dist/assets/`: confirmar que os arquivos têm hash no nome (padrão `[name]-[hash].js` do Vite). Se `vite.config.ts` customizar `chunkFileNames` sem hash, o `RouteErrorBoundary` não cobriria stale chunks — verificar e ajustar se necessário.
4. Forçar erro: jogar `throw new Error("test")` em uma página lazy → ver fallback genérico com "Tentar novamente" funcionando.

---

## Arquivos

| Arquivo | Operação |
|---|---|
| `src/components/RouteErrorBoundary.tsx` | Criar |
| `src/App.tsx` | Refatorar |

Nenhum outro arquivo é tocado. Sem mudanças em rotas, providers, ou comportamento de auth.