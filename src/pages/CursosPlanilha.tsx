import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCursosResumo } from "@/hooks/useCursosResumo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Search, Users, GraduationCap, Hourglass, Ticket } from "lucide-react";

type UnidadeFilter = "todos" | "sao_paulo" | "brasilia";

const unidadeLabel = (u: "sao_paulo" | "brasilia") => (u === "sao_paulo" ? "SP" : "DF");

const ANO_ATUAL = new Date().getFullYear();
const ANOS_DISPONIVEIS = [ANO_ATUAL + 1, ANO_ATUAL, ANO_ATUAL - 1, ANO_ATUAL - 2, ANO_ATUAL - 3];

export default function CursosPlanilha() {
  const [ano, setAno] = useState<number | "todos">(2026);
  const { data, isLoading, isError, refetch, isFetching } = useCursosResumo(
    ano === "todos" ? undefined : ano
  );
  const [unidade, setUnidade] = useState<UnidadeFilter>("todos");
  const [busca, setBusca] = useState("");
  const [syncing, setSyncing] = useState(false);

  const cursos = data || [];

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cursos.filter((c) => {
      if (unidade !== "todos" && c.unidade !== unidade) return false;
      if (!q) return true;
      return c.nome.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q);
    });
  }, [cursos, unidade, busca]);

  const totais = useMemo(
    () =>
      filtrados.reduce(
        (acc, c) => {
          acc.vagas += c.vagas;
          acc.pagos += c.pagos;
          acc.pre += c.pre;
          acc.restantes += c.vagasRestantes;
          return acc;
        },
        { vagas: 0, pagos: 0, pre: 0, restantes: 0 }
      ),
    [filtrados]
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-google-sheets");
      if (error) throw error;
      toast.success("Sincronização concluída");
      await refetch();
    } catch (e: any) {
      toast.error("Falha ao sincronizar", { description: e?.message ?? String(e) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cursos (Planilha)</h1>
            <p className="text-sm text-muted-foreground">
              Resumo agregado dos dados sincronizados da planilha.
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ResumoCard icon={Ticket} label="Total de Vagas" value={totais.vagas} />
          <ResumoCard icon={GraduationCap} label="Pagos" value={totais.pagos} />
          <ResumoCard icon={Hourglass} label="Pré-matriculados" value={totais.pre} />
          <ResumoCard icon={Users} label="Vagas Restantes" value={totais.restantes} />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={unidade === "todos" ? "default" : "outline"}
            onClick={() => setUnidade("todos")}
          >
            🌎 Todos
          </Button>
          <Button
            size="sm"
            variant={unidade === "brasilia" ? "default" : "outline"}
            onClick={() => setUnidade("brasilia")}
          >
            🏛️ Brasília (DF)
          </Button>
          <Button
            size="sm"
            variant={unidade === "sao_paulo" ? "default" : "outline"}
            onClick={() => setUnidade("sao_paulo")}
          >
            🌆 São Paulo (SP)
          </Button>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar curso ou código…"
              className="pl-8"
            />
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-sm text-destructive">
                Erro ao carregar dados. Tente sincronizar novamente.
              </div>
            ) : filtrados.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum curso encontrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead className="w-20">Unidade</TableHead>
                    <TableHead className="text-right w-20">Vagas</TableHead>
                    <TableHead className="text-right w-20">Pagos</TableHead>
                    <TableHead className="text-right w-20">Pré</TableHead>
                    <TableHead className="text-right w-20">Total</TableHead>
                    <TableHead className="text-right w-28">Restantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.nome}</div>
                        <div className="text-xs text-muted-foreground">{c.codigo}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.unidade === "brasilia" ? "secondary" : "default"}>
                          {unidadeLabel(c.unidade)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.vagas}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.pagos}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.pre}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {c.total}
                      </TableCell>
                      <TableCell className="text-right">
                        <RestantesBadge value={c.vagasRestantes} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtrados.length} curso(s) exibido(s)</span>
          <span>{isFetching ? "Atualizando…" : "Atualizado a cada 5 minutos"}</span>
        </div>
      </main>
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums text-primary">{value}</div>
      </CardContent>
    </Card>
  );
}

function RestantesBadge({ value }: { value: number }) {
  if (value <= 0) return <Badge variant="destructive">LOTADO</Badge>;
  if (value <= 5)
    return (
      <Badge variant="outline" className="border-warning/40 text-warning">
        {value}
      </Badge>
    );
  return <Badge variant="default">{value}</Badge>;
}
