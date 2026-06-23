import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, MessageSquare, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ClassStatus, classStatusLabel, formatClassDateRange, unitLabel } from "@/lib/courseHelpers";
import { loadAllCourseClasses } from "@/lib/classGroupsResolver";

interface ClassEvent {
  class_id: string;
  course_id: string;
  course_name: string;
  unit: "sao_paulo" | "brasilia";
  type: "pos_graduacao" | "modular";
  start_date: string;
  end_date: string | null;
  status: ClassStatus;
}
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuickMessage {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface CourseRow {
  id: string;
  name: string;
  type: "pos_graduacao" | "modular";
  unit: "sao_paulo" | "brasilia";
}

type UnitFilter = "all" | "sao_paulo" | "brasilia";
type TypeFilter = "all" | "modular" | "pos_graduacao";
type PeriodKind =
  | "month"
  | "this_semester"
  | "next_semester"
  | "this_year"
  | "next_year"
  | "next_30"
  | "next_60"
  | "next_90";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_EMOJI: Record<ClassStatus, string> = {
  atual: "🟢",
  proxima: "✅",
  aguardando_confirmacao: "🟡",
  encerrada: "⚪",
};

const QuickMessages = () => {
  const { user } = useAuth();
  const [classEvents, setClassEvents] = useState<ClassEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // ---------------- Custom messages ----------------
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [editing, setEditing] = useState<QuickMessage | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  useEffect(() => {
    document.title = "Mensagens Frequentes | Nexus";
    if (user) loadMessages();
  }, [user]);

  const loadMessages = async () => {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from("quick_messages")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setMessages((data as QuickMessage[]) || []);
    setLoadingMsgs(false);
  };

  const openNew = () => {
    setEditing(null);
    setFormTitle("");
    setFormContent("");
    setFormOpen(true);
  };

  const openEdit = (m: QuickMessage) => {
    setEditing(m);
    setFormTitle(m.title);
    setFormContent(m.content);
    setFormOpen(true);
  };

  const saveMessage = async () => {
    if (!user) return;
    const title = formTitle.trim();
    const content = formContent.trim();
    if (!title || !content) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("quick_messages")
        .update({ title, content })
        .eq("id", editing.id);
      if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      toast({ title: "Mensagem atualizada" });
    } else {
      const { error } = await supabase
        .from("quick_messages")
        .insert({ user_id: user.id, title, content });
      if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      toast({ title: "Mensagem criada" });
    }
    setFormOpen(false);
    loadMessages();
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("quick_messages").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Mensagem excluída" });
    loadMessages();
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  // ---------------- Course templates ----------------
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [periodKind, setPeriodKind] = useState<PeriodKind>("this_semester");
  const [monthIdx, setMonthIdx] = useState<number>(new Date().getMonth());
  const [yearRef, setYearRef] = useState<number>(new Date().getFullYear());
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [includeUnit, setIncludeUnit] = useState(true);
  const [includeType, setIncludeType] = useState(true);
  const [intro, setIntro] = useState("Olá! Veja abaixo os cursos disponíveis:");
  const [outro, setOutro] = useState("Posso te ajudar com mais informações sobre algum deles?");

  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      const [{ data: coursesData }, classesData] = await Promise.all([
        supabase.from("courses").select("id,name,type,unit").order("name", { ascending: true }),
        loadAllCourseClasses(),
      ]);
      const cs = (coursesData as CourseRow[]) || [];
      setCourses(cs);
      const cmap = new Map(cs.map((c) => [c.id, c]));
      const evts: ClassEvent[] = [];
      for (const cl of classesData) {
        const c = cmap.get(cl.course_id);
        if (!c || !cl.start_date) continue;
        evts.push({
          class_id: cl.id,
          course_id: cl.course_id,
          course_name: c.name,
          unit: c.unit,
          type: c.type,
          start_date: cl.start_date,
          end_date: cl.end_date,
          status: cl.status,
        });
      }
      setClassEvents(evts);
      setLoadingEvents(false);
    })();
  }, []);

  const periodRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOf = (y: number, m: number, d: number) => new Date(y, m, d);
    const endOf = (y: number, m: number, d: number) => new Date(y, m, d, 23, 59, 59);

    switch (periodKind) {
      case "month":
        return {
          start: startOf(yearRef, monthIdx, 1),
          end: endOf(yearRef, monthIdx + 1, 0),
          label: `${MONTHS[monthIdx]} de ${yearRef}`,
        };
      case "this_semester": {
        const m = today.getMonth();
        const isFirst = m < 6;
        return {
          start: startOf(today.getFullYear(), isFirst ? 0 : 6, 1),
          end: endOf(today.getFullYear(), isFirst ? 6 : 12, 0),
          label: `${isFirst ? "1º" : "2º"} semestre de ${today.getFullYear()}`,
        };
      }
      case "next_semester": {
        const m = today.getMonth();
        const isFirst = m < 6;
        const y = isFirst ? today.getFullYear() : today.getFullYear() + 1;
        const startMonth = isFirst ? 6 : 0;
        return {
          start: startOf(y, startMonth, 1),
          end: endOf(y, startMonth + 6, 0),
          label: `${isFirst ? "2º" : "1º"} semestre de ${y}`,
        };
      }
      case "this_year":
        return {
          start: startOf(today.getFullYear(), 0, 1),
          end: endOf(today.getFullYear(), 12, 0),
          label: `${today.getFullYear()}`,
        };
      case "next_year":
        return {
          start: startOf(today.getFullYear() + 1, 0, 1),
          end: endOf(today.getFullYear() + 1, 12, 0),
          label: `${today.getFullYear() + 1}`,
        };
      case "next_30":
      case "next_60":
      case "next_90": {
        const days = periodKind === "next_30" ? 30 : periodKind === "next_60" ? 60 : 90;
        const end = new Date(today);
        end.setDate(end.getDate() + days);
        return { start: today, end, label: `próximos ${days} dias` };
      }
    }
  }, [periodKind, monthIdx, yearRef]);

  const filteredEvents = useMemo(() => {
    const { start, end } = periodRange;
    return classEvents
      .filter((e) => {
        const d = new Date(e.start_date + "T00:00:00");
        if (d < start || d > end) return false;
        if (unitFilter !== "all" && e.unit !== unitFilter) return false;
        if (typeFilter !== "all" && e.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  }, [classEvents, periodRange, unitFilter, typeFilter]);

  const generatedItems = useMemo(() => {
    const isGiob = (name: string) => name.includes("GIOB") || name.includes("Ginecologia e Obstetrícia");
    const isTrvg = (name: string) => name.includes("TRVG") || name.includes("Transvaginal");
    const isCombined = (name: string) => name.includes("GIOB + TRVG");

    const keyOf = (e: ClassEvent) => [e.course_id, e.start_date, e.end_date || "", e.status].join("|");
    const comboWindowKey = (e: ClassEvent) => `${e.unit}|${e.status}|${e.start_date}`;
    const combined = filteredEvents.filter((e) => isCombined(e.course_name));
    const combinedWindows = new Set(combined.map(comboWindowKey));
    const giobByUnitStatus = new Map<string, ClassEvent[]>();
    const trvgByUnitStatus = new Map<string, ClassEvent[]>();
    const otherItems: Array<ClassEvent | { synthetic: true; unit: ClassEvent["unit"]; type: ClassEvent["type"]; status: ClassStatus; course_name: string; start_date: string; end_date: string | null; _sort: string; _dedupe: string; }> = [...combined];

    for (const e of filteredEvents) {
      if (isCombined(e.course_name)) continue;
      if (combinedWindows.has(comboWindowKey(e)) && (isGiob(e.course_name) || (isTrvg(e.course_name) && !e.course_name.includes("Avançado")))) {
        continue;
      }

      const mapKey = `${e.unit}|${e.status}`;
      if (isGiob(e.course_name)) {
        const arr = giobByUnitStatus.get(mapKey) || [];
        arr.push(e);
        giobByUnitStatus.set(mapKey, arr);
      } else if (isTrvg(e.course_name) && !e.course_name.includes("Avançado")) {
        const arr = trvgByUnitStatus.get(mapKey) || [];
        arr.push(e);
        trvgByUnitStatus.set(mapKey, arr);
      } else {
        otherItems.push(e);
      }
    }

    for (const [mapKey, giobs] of giobByUnitStatus.entries()) {
      const trvgs = [...(trvgByUnitStatus.get(mapKey) || [])];
      for (const giob of giobs) {
        const idx = trvgs.findIndex((trvg) => trvg.start_date >= giob.start_date);
        if (idx >= 0) {
          const trvg = trvgs[idx];
          trvgs.splice(idx, 1);
          otherItems.push({
            synthetic: true,
            unit: giob.unit,
            type: giob.type,
            status: giob.status,
            course_name: giob.unit === "brasilia"
              ? "CM US GIOB + TRVG: Básico em Ginecologia, Obstetrícia e Transvaginal"
              : "Básico GIOB + TRVG (Ginecologia, Obstetrícia e Transvaginal)",
            start_date: giob.start_date,
            end_date: trvg.end_date || giob.end_date,
            _sort: giob.start_date,
            _dedupe: `${giob.unit}|${giob.start_date}|${trvg.end_date || giob.end_date}|${giob.status}|giob-trvg`,
          });
        } else {
          otherItems.push(giob);
        }
      }
      trvgs.forEach((trvg) => otherItems.push(trvg));
    }

    for (const [mapKey, trvgs] of trvgByUnitStatus.entries()) {
      if (giobByUnitStatus.has(mapKey)) continue;
      trvgs.forEach((trvg) => otherItems.push(trvg));
    }

    const seen = new Set<string>();
    return otherItems
      .filter((item: any) => {
        const dedupe = item.synthetic ? item._dedupe : keyOf(item);
        if (seen.has(dedupe)) return false;
        seen.add(dedupe);
        return true;
      })
      .sort((a: any, b: any) => ((a._sort || a.start_date) < (b._sort || b.start_date) ? -1 : 1));
  }, [filteredEvents]);

  const generatedMessage = useMemo(() => {
    const lines: string[] = [];
    if (intro.trim()) lines.push(intro.trim(), "");
    lines.push(`📅 Cursos – ${periodRange.label}`, "");

    if (generatedItems.length === 0) {
      lines.push("Nenhum curso programado neste período.");
    } else {
      const groups: Record<string, typeof generatedItems> = {};
      const showGrouped = unitFilter === "all" && includeUnit;
      generatedItems.forEach((e) => {
        const key = showGrouped ? e.unit : "_all";
        (groups[key] ||= []).push(e);
      });

      const renderEvent = (e: any) => {
        const tags: string[] = [];
        if (includeType) {
          tags.push(e.type === "pos_graduacao" ? "Pós-graduação" : "Curso modular");
        }
        if (includeUnit && !showGrouped) {
          tags.push(unitLabel(e.unit));
        }
        const tagStr = tags.length ? ` (${tags.join(" • ")})` : "";
        const dates = formatClassDateRange(e.start_date, e.end_date);
        const emoji = STATUS_EMOJI[e.status] || "📅";
        return `• ${e.course_name}${tagStr}\n   ${emoji} ${dates}\n   _${classStatusLabel(e.status)}_`;
      };

      if (showGrouped) {
        for (const unit of ["sao_paulo", "brasilia"] as const) {
          const arr = groups[unit];
          if (!arr?.length) continue;
          lines.push(`📍 ${unitLabel(unit)}`);
          arr.forEach((e) => lines.push(renderEvent(e)));
          lines.push("");
        }
      } else {
        (groups["_all"] || []).forEach((e) => lines.push(renderEvent(e)));
        lines.push("");
      }
    }

    if (outro.trim()) lines.push(outro.trim());
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }, [intro, outro, periodRange, generatedItems, includeUnit, includeType, unitFilter]);

  const saveAsCustom = async () => {
    if (!user) return;
    const title = `Cursos – ${periodRange.label}`;
    const { error } = await supabase
      .from("quick_messages")
      .insert({ user_id: user.id, title, content: generatedMessage });
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    toast({ title: "Salva em Minhas Mensagens" });
    loadMessages();
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mensagens Frequentes</h1>
          <p className="text-sm text-muted-foreground">
            Crie respostas prontas e gere listas de cursos por período em um clique.
          </p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Templates de cursos
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Minhas mensagens
            </TabsTrigger>
          </TabsList>

          {/* ============== TEMPLATES ============== */}
          <TabsContent value="templates" className="mt-4 sm:mt-6">
            <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configurar template</CardTitle>
                  <CardDescription>Escolha o período e a unidade.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={periodKind} onValueChange={(v) => setPeriodKind(v as PeriodKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Mês específico</SelectItem>
                        <SelectItem value="this_semester">Este semestre</SelectItem>
                        <SelectItem value="next_semester">Próximo semestre</SelectItem>
                        <SelectItem value="this_year">Este ano</SelectItem>
                        <SelectItem value="next_year">Próximo ano</SelectItem>
                        <SelectItem value="next_30">Próximos 30 dias</SelectItem>
                        <SelectItem value="next_60">Próximos 60 dias</SelectItem>
                        <SelectItem value="next_90">Próximos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {periodKind === "month" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Mês</Label>
                        <Select value={String(monthIdx)} onValueChange={(v) => setMonthIdx(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m, i) => (
                              <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ano</Label>
                        <Select value={String(yearRef)} onValueChange={(v) => setYearRef(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {yearOptions.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select value={unitFilter} onValueChange={(v) => setUnitFilter(v as UnitFilter)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas (SP + BSB)</SelectItem>
                        <SelectItem value="sao_paulo">São Paulo</SelectItem>
                        <SelectItem value="brasilia">Brasília</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mostrar nos itens</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={includeUnit ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIncludeUnit((v) => !v)}
                      >
                        Unidade
                      </Button>
                      <Button
                        type="button"
                        variant={includeType ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIncludeType((v) => !v)}
                      >
                        Tipo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Saudação</Label>
                    <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Encerramento</Label>
                    <Textarea value={outro} onChange={(e) => setOutro(e.target.value)} rows={2} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-lg">Mensagem gerada</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mr-1">{filteredEvents.length} cursos</Badge>
                      {periodRange.label}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={saveAsCustom}>
                      <Plus className="h-4 w-4" /> Salvar
                    </Button>
                    <Button size="sm" onClick={() => copyText(generatedMessage)}>
                      <Copy className="h-4 w-4" /> Copiar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Textarea
                      value={generatedMessage}
                      onChange={() => {}}
                      readOnly
                      rows={20}
                      className="font-mono text-sm"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============== CUSTOM ============== */}
          <TabsContent value="custom" className="mt-4 sm:mt-6">
            <div className="mb-3 flex justify-end">
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Nova mensagem
              </Button>
            </div>

            {loadingMsgs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma mensagem cadastrada ainda. Clique em <b>Nova mensagem</b> para começar.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {messages.map((m) => (
                  <Card key={m.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-base">{m.title}</CardTitle>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyText(m.content)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMessage(m.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                        {m.content}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Form dialog */}
            <AlertDialog open={formOpen} onOpenChange={setFormOpen}>
              <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{editing ? "Editar mensagem" : "Nova mensagem"}</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo</Label>
                    <Textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      rows={10}
                      maxLength={5000}
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={saveMessage}>Salvar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default QuickMessages;
