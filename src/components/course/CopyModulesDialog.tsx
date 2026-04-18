import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { tokenize } from "@/lib/courseSiblings";

interface CourseOption {
  id: string;
  name: string;
  unit: "sao_paulo" | "brasilia";
  module_count: number;
}

interface ModulePreview {
  title: string;
  description: string | null;
  workload_hours: number | null;
  order_index: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetCourseId: string | null; // null = ainda não salvo
  targetCourseName: string;
  onCopied: (modules: ModulePreview[]) => void;
}

export const CopyModulesDialog = ({ open, onOpenChange, targetCourseId, targetCourseName, onCopied }: Props) => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ModulePreview[]>([]);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setPreview([]);
    setSearch("");
    loadCourses();
  }, [open]);

  const loadCourses = async () => {
    setLoading(true);
    const { data: cs } = await supabase.from("courses").select("id, name, unit");
    const { data: ms } = await supabase.from("course_modules").select("course_id");
    const counts = new Map<string, number>();
    (ms || []).forEach((m) => counts.set(m.course_id, (counts.get(m.course_id) || 0) + 1));
    const list: CourseOption[] = (cs || [])
      .filter((c) => c.id !== targetCourseId && (counts.get(c.id) || 0) > 0)
      .map((c) => ({ id: c.id, name: c.name, unit: c.unit as any, module_count: counts.get(c.id) || 0 }));
    setCourses(list);
    setLoading(false);
  };

  const targetTokens = useMemo(() => new Set(tokenize(targetCourseName)), [targetCourseName]);

  const sorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    const score = (c: CourseOption) => {
      const tok = new Set(tokenize(c.name));
      let inter = 0;
      for (const t of tok) if (targetTokens.has(t)) inter++;
      return inter;
    };
    return [...courses]
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  }, [courses, search, targetTokens]);

  const selectCourse = async (id: string) => {
    setSelectedId(id);
    const { data } = await supabase
      .from("course_modules")
      .select("title, description, workload_hours, order_index")
      .eq("course_id", id)
      .order("order_index");
    setPreview((data as ModulePreview[]) || []);
  };

  const handleCopy = async () => {
    if (!selectedId || preview.length === 0) return;
    setCopying(true);

    try {
      if (targetCourseId) {
        // Curso já existe: persiste direto no banco
        if (mode === "replace") {
          await supabase.from("course_modules").delete().eq("course_id", targetCourseId);
        }
        const baseIndex = mode === "append"
          ? (await supabase.from("course_modules").select("order_index").eq("course_id", targetCourseId).order("order_index", { ascending: false }).limit(1)).data?.[0]?.order_index ?? -1
          : -1;
        const rows = preview.map((m, i) => ({
          course_id: targetCourseId,
          title: m.title,
          description: m.description,
          workload_hours: m.workload_hours,
          order_index: baseIndex + 1 + i,
        }));
        const { error } = await supabase.from("course_modules").insert(rows);
        if (error) throw error;
      }
      onCopied(preview);
      toast({ title: "Módulos copiados", description: `${preview.length} módulo(s) ${mode === "replace" ? "substituíram" : "adicionados a"} o conteúdo atual.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao copiar", description: e.message, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Copiar conteúdo programático</DialogTitle>
          <DialogDescription>
            Use os módulos de outro curso como base. Útil quando o mesmo curso existe em SP e Brasília.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Lista de cursos */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar curso..." className="pl-8" />
            </div>
            <ScrollArea className="h-72 rounded-md border">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : sorted.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum curso com módulos cadastrados.</p>
              ) : (
                <ul className="divide-y">
                  {sorted.map((c, idx) => {
                    const isSuggestion = idx < 3 && Array.from(tokenize(c.name)).some((t) => targetTokens.has(t));
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => selectCourse(c.id)}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selectedId === c.id ? "bg-accent" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            {isSuggestion && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                            <span className="font-medium">{c.name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{c.unit === "sao_paulo" ? "SP" : "BSB"}</Badge>
                            <span className="text-xs text-muted-foreground">{c.module_count} módulo(s)</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm">Preview ({preview.length} módulo(s))</Label>
            <ScrollArea className="h-72 rounded-md border p-3">
              {preview.length === 0 ? (
                <p className="text-sm text-muted-foreground">Selecione um curso para ver os módulos.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {preview.map((m, i) => (
                    <li key={i} className="border-l-2 border-primary/40 pl-2">
                      <div className="font-medium">{i + 1}. {m.title}</div>
                      {m.description && <div className="text-xs text-muted-foreground line-clamp-2">{m.description}</div>}
                      {m.workload_hours != null && <div className="text-xs text-muted-foreground">{m.workload_hours}h</div>}
                    </li>
                  ))}
                </ol>
              )}
            </ScrollArea>

            {preview.length > 0 && (
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-1 pt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="mode-replace" />
                  <Label htmlFor="mode-replace" className="text-sm font-normal">Substituir módulos atuais</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="append" id="mode-append" />
                  <Label htmlFor="mode-append" className="text-sm font-normal">Adicionar ao final</Label>
                </div>
              </RadioGroup>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCopy} disabled={!selectedId || preview.length === 0 || copying}>
            {copying && <Loader2 className="h-4 w-4 animate-spin" />}
            Copiar {preview.length > 0 ? `${preview.length} módulo(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
