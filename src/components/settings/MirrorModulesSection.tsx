import { useEffect, useState } from "react";
import { ArrowRight, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { findSiblingPairs, findMirrorOpportunities, type CourseLite, type SiblingPair } from "@/lib/courseSiblings";

export const MirrorModulesSection = () => {
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<SiblingPair[]>([]);
  const [copyingKey, setCopyingKey] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase.from("courses").select("id, name, unit");
    const { data: ms } = await supabase.from("course_modules").select("course_id");
    const counts = new Map<string, number>();
    (ms || []).forEach((m) => counts.set(m.course_id, (counts.get(m.course_id) || 0) + 1));
    const list: CourseLite[] = (cs || []).map((c) => ({
      id: c.id, name: c.name, unit: c.unit as any, module_count: counts.get(c.id) || 0,
    }));
    setPairs(findSiblingPairs(list));
    setLoading(false);
  };

  const opportunities = findMirrorOpportunities(pairs);

  const copyPair = async (pair: SiblingPair): Promise<{ ok: boolean; count: number; error?: string }> => {
    if (!pair.sao_paulo || !pair.brasilia) return { ok: false, count: 0 };
    const source = pair.sao_paulo.module_count > 0 ? pair.sao_paulo : pair.brasilia;
    const target = source.id === pair.sao_paulo.id ? pair.brasilia : pair.sao_paulo;

    const { data: mods, error: e1 } = await supabase
      .from("course_modules")
      .select("title, description, workload_hours, order_index")
      .eq("course_id", source.id)
      .order("order_index");
    if (e1) return { ok: false, count: 0, error: e1.message };
    if (!mods || mods.length === 0) return { ok: false, count: 0, error: "Curso de origem sem módulos" };

    await supabase.from("course_modules").delete().eq("course_id", target.id);
    const rows = mods.map((m, i) => ({
      course_id: target.id,
      title: m.title,
      description: m.description,
      workload_hours: m.workload_hours,
      order_index: i,
    }));
    const { error: e2 } = await supabase.from("course_modules").insert(rows);
    if (e2) return { ok: false, count: 0, error: e2.message };
    return { ok: true, count: rows.length };
  };

  const handleCopyOne = async (pair: SiblingPair) => {
    setCopyingKey(pair.key);
    const r = await copyPair(pair);
    setCopyingKey(null);
    if (r.ok) {
      toast({ title: "Conteúdo espelhado", description: `${r.count} módulo(s) copiados.` });
      load();
    } else {
      toast({ title: "Erro ao copiar", description: r.error, variant: "destructive" });
    }
  };

  const handleBulkCopy = async () => {
    if (opportunities.length === 0) return;
    if (!confirm(`Copiar conteúdo programático em ${opportunities.length} par(es) de cursos? Isso vai sobrescrever os módulos vazios.`)) return;
    setBulkRunning(true);
    let ok = 0, fail = 0, total = 0;
    for (const p of opportunities) {
      const r = await copyPair(p);
      if (r.ok) { ok++; total += r.count; } else fail++;
    }
    setBulkRunning(false);
    toast({
      title: "Espelhamento concluído",
      description: `${ok} curso(s) atualizado(s) · ${total} módulo(s) copiados${fail ? ` · ${fail} falha(s)` : ""}`,
    });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="h-5 w-5 text-primary" />
          Espelhar conteúdo entre unidades
        </CardTitle>
        <CardDescription>
          Detecta cursos com o mesmo nome em São Paulo e Brasília e copia os módulos do lado preenchido para o lado vazio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={load} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" /> Atualizar
              </Button>
              {opportunities.length > 0 && (
                <Button onClick={handleBulkCopy} disabled={bulkRunning} size="sm">
                  {bulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Copiar todos os {opportunities.length} pares vazios
                </Button>
              )}
            </div>

            {pairs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum par de cursos gêmeos detectado.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {pairs.length} par(es) detectado(s) · {opportunities.length} com oportunidade de espelhamento
                </p>
                <ul className="divide-y rounded-md border">
                  {pairs.map((p) => {
                    const sp = p.sao_paulo!;
                    const bsb = p.brasilia!;
                    const spEmpty = sp.module_count === 0;
                    const bsbEmpty = bsb.module_count === 0;
                    const isOpp = (spEmpty && bsb.module_count > 0) || (bsbEmpty && sp.module_count > 0);
                    const direction = spEmpty ? "BSB → SP" : bsbEmpty ? "SP → BSB" : null;
                    return (
                      <li key={p.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="outline">SP</Badge>
                            <span className={spEmpty ? "text-muted-foreground" : "font-medium"}>{sp.name}</span>
                            <Badge variant={spEmpty ? "destructive" : "secondary"} className="text-xs">{sp.module_count} mód.</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="outline">BSB</Badge>
                            <span className={bsbEmpty ? "text-muted-foreground" : "font-medium"}>{bsb.name}</span>
                            <Badge variant={bsbEmpty ? "destructive" : "secondary"} className="text-xs">{bsb.module_count} mód.</Badge>
                          </div>
                        </div>
                        {isOpp && direction && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={copyingKey === p.key || bulkRunning}
                            onClick={() => handleCopyOne(p)}
                          >
                            {copyingKey === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Copiar {direction}
                          </Button>
                        )}
                        {!isOpp && (
                          <Badge variant="outline" className="text-xs">
                            {sp.module_count > 0 && bsb.module_count > 0 ? "Ambos preenchidos" : "Ambos vazios"}
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
