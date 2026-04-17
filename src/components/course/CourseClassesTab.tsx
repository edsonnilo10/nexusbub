import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Save, Copy, Check, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CourseFull, CourseClass, ClassStatus, classStatusLabel, classStatusVariant, formatClassDateRange, unitLabel,
} from "@/lib/courseHelpers";
import { classesBlock } from "@/lib/whatsappTemplates";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  classes: CourseClass[];
  onChange: (next: CourseClass[]) => void;
}

interface Draft {
  id?: string;
  start_date: string;
  end_date: string;
  status: ClassStatus;
  location: string;
  notes: string;
  _dirty?: boolean;
  _new?: boolean;
}

const emptyDraft = (course: CourseFull): Draft => ({
  start_date: "",
  end_date: "",
  status: "aguardando_confirmacao",
  location: `Escola NEXUS – ${unitLabel(course.unit)}/${course.unit === "brasilia" ? "DF" : "SP"}`,
  notes: "",
  _new: true,
  _dirty: true,
});

const toDraft = (c: CourseClass): Draft => ({
  id: c.id,
  start_date: c.start_date || "",
  end_date: c.end_date || "",
  status: c.status as ClassStatus,
  location: c.location || "",
  notes: c.notes || "",
});

export const CourseClassesTab = ({ course, classes, onChange }: Props) => {
  const [drafts, setDrafts] = useState<Draft[]>(classes.map(toDraft));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDrafts(classes.map(toDraft));
  }, [classes]);

  const upcoming = useMemo(
    () => drafts
      .filter((d) => d.start_date && d.status !== "encerrada")
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [drafts]
  );

  const update = (i: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch, _dirty: true } : d)));
  };

  const addClass = () => setDrafts((prev) => [...prev, emptyDraft(course)]);

  const removeClass = async (i: number) => {
    const d = drafts[i];
    if (d.id) {
      const { error } = await supabase.from("course_classes").delete().eq("id", d.id);
      if (error) {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        return;
      }
    }
    const next = drafts.filter((_, idx) => idx !== i);
    setDrafts(next);
    onChange(
      next
        .filter((x) => x.id)
        .map((x) => ({
          id: x.id!,
          course_id: course.id,
          start_date: x.start_date || null,
          end_date: x.end_date || null,
          status: x.status,
          location: x.location || null,
          notes: x.notes || null,
        }))
    );
    toast({ title: "Turma removida" });
  };

  const saveAll = async () => {
    const dirty = drafts.filter((d) => d._dirty && d.start_date);
    if (dirty.length === 0) {
      toast({ title: "Nada para salvar" });
      return;
    }
    setSaving(true);

    const toInsert = dirty.filter((d) => !d.id).map((d) => ({
      course_id: course.id,
      start_date: d.start_date,
      end_date: d.end_date || null,
      status: d.status,
      location: d.location.trim() || null,
      notes: d.notes.trim() || null,
    }));
    const toUpdate = dirty.filter((d) => d.id);

    let hadError = false;

    if (toInsert.length > 0) {
      const { error } = await supabase.from("course_classes").insert(toInsert);
      if (error) { hadError = true; toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); }
    }
    for (const d of toUpdate) {
      const { error } = await supabase.from("course_classes")
        .update({
          start_date: d.start_date,
          end_date: d.end_date || null,
          status: d.status,
          location: d.location.trim() || null,
          notes: d.notes.trim() || null,
        })
        .eq("id", d.id!);
      if (error) { hadError = true; toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); }
    }

    // refetch
    const { data } = await supabase.from("course_classes").select("*").eq("course_id", course.id);
    onChange((data as CourseClass[]) || []);
    setSaving(false);
    if (!hadError) toast({ title: "Turmas salvas" });
  };

  const copyToWhatsApp = async () => {
    const persisted: CourseClass[] = drafts
      .filter((d) => d.start_date)
      .map((d, idx) => ({
        id: d.id || `tmp-${idx}`,
        course_id: course.id,
        start_date: d.start_date,
        end_date: d.end_date || null,
        status: d.status,
        location: d.location || null,
        notes: d.notes || null,
      }));
    const text = classesBlock(persisted);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Bloco de turmas copiado para o WhatsApp" });
    setTimeout(() => setCopied(false), 2000);
  };

  const dirtyCount = drafts.filter((d) => d._dirty && d.start_date).length;

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5 text-accent" /> Próximas turmas
              </CardTitle>
              <CardDescription>
                {upcoming.length === 0
                  ? "Nenhuma turma futura cadastrada."
                  : `${upcoming.length} turma${upcoming.length > 1 ? "s" : ""} agendada${upcoming.length > 1 ? "s" : ""}.`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={copyToWhatsApp} disabled={upcoming.length === 0}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar bloco WhatsApp"}
            </Button>
          </div>
        </CardHeader>
        {upcoming.length > 0 && (
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((d, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-secondary/20 p-3">
                <Badge variant={classStatusVariant(d.status)} className="shrink-0">
                  {classStatusLabel(d.status)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {formatClassDateRange(d.start_date, d.end_date)}
                  </div>
                  {d.location && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{d.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Gerenciar turmas</CardTitle>
            <CardDescription>Adicione, edite ou remova as datas e o status de cada turma.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addClass}>
              <Plus className="h-4 w-4" /> Turma
            </Button>
            <Button size="sm" onClick={saveAll} disabled={saving || dirtyCount === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {drafts.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma turma cadastrada. Clique em <strong>Turma</strong> para adicionar.
            </p>
          )}

          {drafts.map((d, i) => (
            <div key={d.id || `new-${i}`} className="rounded-lg border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={d.start_date} onChange={(e) => update(i, { start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Término</Label>
                  <Input type="date" value={d.end_date} onChange={(e) => update(i, { end_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={d.status} onValueChange={(v) => update(i, { status: v as ClassStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atual">Em andamento</SelectItem>
                      <SelectItem value="proxima">Confirmada</SelectItem>
                      <SelectItem value="aguardando_confirmacao">Aguardando confirmação</SelectItem>
                      <SelectItem value="encerrada">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="icon" onClick={() => removeClass(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Local</Label>
                  <Input value={d.location} onChange={(e) => update(i, { location: e.target.value })} placeholder="Escola NEXUS – São Paulo/SP" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observações (interno)</Label>
                  <Input value={d.notes} onChange={(e) => update(i, { notes: e.target.value })} placeholder="Ex.: Data própria, vagas limitadas…" />
                </div>
              </div>
              {d.start_date && (
                <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <Badge variant={classStatusVariant(d.status)}>{classStatusLabel(d.status)}</Badge>
                  <span>{formatClassDateRange(d.start_date, d.end_date)}</span>
                </div>
              )}
            </div>
          ))}

          {drafts.length > 0 && (
            <Textarea
              readOnly
              value={classesBlock(
                drafts.filter((d) => d.start_date).map((d, idx) => ({
                  id: d.id || `tmp-${idx}`,
                  course_id: course.id,
                  start_date: d.start_date,
                  end_date: d.end_date || null,
                  status: d.status,
                  location: d.location || null,
                  notes: d.notes || null,
                }))
              )}
              className="mt-2 min-h-[140px] font-mono text-xs leading-relaxed"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
