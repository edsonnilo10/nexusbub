import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { unitLabel, type CourseUnit } from "@/lib/courseHelpers";
import type {
  ClassGroupRow,
  CourseOption,
  GroupCourseRow,
} from "@/pages/ClassGroups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ClassGroupRow | null;
  courses: CourseOption[];
  existingCourses: GroupCourseRow[];
  onSaved: () => void | Promise<void>;
}

interface DraftCourse {
  id?: string; // existing row id
  course_id: string;
  display_mode: "individual" | "combo_only" | "both";
  start_date: string | null;
  end_date: string | null;
}

const displayModeLabel = (m: string) =>
  m === "combo_only" ? "Só no combo" : m === "both" ? "Combo + individual" : "Individual";

export const ClassGroupDialog = ({
  open,
  onOpenChange,
  group,
  courses,
  existingCourses,
  onSaved,
}: Props) => {
  const isEditing = !!group;
  const [unit, setUnit] = useState<CourseUnit>("sao_paulo");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ClassGroupRow["status"]>("proxima");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [draftCourses, setDraftCourses] = useState<DraftCourse[]>([]);
  const [addCourseId, setAddCourseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (group) {
      setUnit(group.unit);
      setStartDate(group.start_date);
      setEndDate(group.end_date);
      setStatus(group.status);
      setLocation(group.location ?? "");
      setNotes(group.notes ?? "");
      setDraftCourses(
        existingCourses.map((c) => ({
          id: c.id,
          course_id: c.course_id,
          display_mode: c.display_mode,
          start_date: c.start_date,
          end_date: c.end_date,
        })),
      );
    } else {
      setUnit("sao_paulo");
      const today = format(new Date(), "yyyy-MM-dd");
      setStartDate(today);
      setEndDate(today);
      setStatus("proxima");
      setLocation("");
      setNotes("");
      setDraftCourses([]);
    }
    setAddCourseId("");
  }, [open, group, existingCourses]);

  const availableCourses = useMemo(() => {
    const taken = new Set(draftCourses.map((d) => d.course_id));
    return courses.filter((c) => c.unit === unit && !taken.has(c.id));
  }, [courses, unit, draftCourses]);

  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";

  const addCourse = () => {
    if (!addCourseId) return;
    setDraftCourses((prev) => [
      ...prev,
      { course_id: addCourseId, display_mode: "individual", start_date: null, end_date: null },
    ]);
    setAddCourseId("");
  };

  const updateCourse = (idx: number, patch: Partial<DraftCourse>) => {
    setDraftCourses((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCourse = (idx: number) => {
    setDraftCourses((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Datas obrigatórias", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Data final antes da inicial", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      unit,
      start_date: startDate,
      end_date: endDate,
      status,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    let groupId = group?.id;
    if (isEditing && groupId) {
      const { error } = await supabase.from("class_groups").update(payload).eq("id", groupId);
      if (error) {
        setSaving(false);
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("class_groups")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        toast({
          title: "Erro ao criar janela",
          description: error?.message ?? "Já existe uma janela com essas datas nesta unidade.",
          variant: "destructive",
        });
        return;
      }
      groupId = data.id;
    }

    // Reconciliar vínculos: deletar removidos, upsert restantes
    const existingIds = new Set(existingCourses.map((e) => e.id));
    const keptIds = new Set(draftCourses.filter((d) => d.id).map((d) => d.id!));
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      const { error } = await supabase.from("class_group_courses").delete().in("id", toDelete);
      if (error) {
        toast({ title: "Erro removendo cursos", description: error.message, variant: "destructive" });
      }
    }

    for (const dc of draftCourses) {
      const row = {
        group_id: groupId!,
        course_id: dc.course_id,
        display_mode: dc.display_mode,
        start_date: dc.start_date,
        end_date: dc.end_date,
      };
      if (dc.id) {
        await supabase.from("class_group_courses").update(row).eq("id", dc.id);
      } else {
        await supabase.from("class_group_courses").insert(row);
      }
    }

    setSaving(false);
    toast({ title: isEditing ? "Janela atualizada" : "Janela criada" });
    onOpenChange(false);
    await onSaved();
  };

  const deleteGroup = async () => {
    if (!group) return;
    if (!confirm("Excluir esta janela e todos os vínculos com cursos?")) return;
    setDeleting(true);
    const { error } = await supabase.from("class_groups").delete().eq("id", group.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Janela excluída" });
    onOpenChange(false);
    await onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar janela" : "Nova janela de turma"}</DialogTitle>
          <DialogDescription>
            Uma janela é uma semana de aula em uma unidade. Vincule um ou mais cursos que rodam nessa janela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select
                value={unit}
                onValueChange={(v) => setUnit(v as CourseUnit)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sao_paulo">{unitLabel("sao_paulo")}</SelectItem>
                  <SelectItem value="brasilia">{unitLabel("brasilia")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atual">Em andamento</SelectItem>
                  <SelectItem value="proxima">Confirmada</SelectItem>
                  <SelectItem value="aguardando_confirmacao">Aguardando confirmação</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Local (opcional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Cursos nesta janela</Label>
              <Badge variant="secondary">{draftCourses.length}</Badge>
            </div>

            {draftCourses.length === 0 ? (
              <p className="mb-3 text-xs italic text-muted-foreground">
                Nenhum curso vinculado ainda.
              </p>
            ) : (
              <div className="mb-3 space-y-2">
                {draftCourses.map((dc, idx) => (
                  <div
                    key={dc.id ?? `new-${idx}`}
                    className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{courseName(dc.course_id)}</div>
                    </div>
                    <Select
                      value={dc.display_mode}
                      onValueChange={(v) => updateCourse(idx, { display_mode: v as any })}
                    >
                      <SelectTrigger className="h-8 w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">{displayModeLabel("individual")}</SelectItem>
                        <SelectItem value="both">{displayModeLabel("both")}</SelectItem>
                        <SelectItem value="combo_only">{displayModeLabel("combo_only")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeCourse(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={addCourseId} onValueChange={setAddCourseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar curso para vincular…" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum curso disponível
                    </div>
                  ) : (
                    availableCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addCourse} disabled={!addCourseId}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <strong>Individual:</strong> aparece como turma própria do curso. <strong>Combo + individual:</strong> aparece nos dois lugares. <strong>Só no combo:</strong> só aparece quando vinculado a um curso-combo.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              onClick={deleteGroup}
              disabled={deleting || saving}
              className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
