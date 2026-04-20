import { useEffect, useState } from "react";
import { Layers, Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

type DisplayMode = "individual" | "combo_only" | "both";
type ComboRule = {
  id: string;
  name: string;
  combo_course_id: string;
  trigger_course_ids: string[];
  combo_display_mode: DisplayMode;
  individuals_display_mode: DisplayMode;
  active: boolean;
};
type CourseLite = { id: string; name: string; unit: string };

const MODE_LABEL: Record<DisplayMode, string> = {
  individual: "Individual",
  combo_only: "Apenas no combo",
  both: "Ambos",
};

const emptyForm = {
  id: null as string | null,
  name: "",
  combo_course_id: "",
  trigger_course_ids: [] as string[],
  combo_display_mode: "combo_only" as DisplayMode,
  individuals_display_mode: "both" as DisplayMode,
  active: true,
};

export const ComboRulesSection = () => {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<ComboRule[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [rulesRes, coursesRes] = await Promise.all([
      supabase.from("course_combo_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, name, unit").order("name"),
    ]);
    setRules((rulesRes.data || []) as ComboRule[]);
    setCourses((coursesRes.data || []) as CourseLite[]);
    setLoading(false);
  };

  const courseName = (id: string) => {
    const c = courses.find((c) => c.id === id);
    return c ? `${c.name} (${c.unit === "sao_paulo" ? "SP" : "BSB"})` : "—";
  };

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (r: ComboRule) => {
    setForm({
      id: r.id,
      name: r.name,
      combo_course_id: r.combo_course_id,
      trigger_course_ids: r.trigger_course_ids,
      combo_display_mode: r.combo_display_mode,
      individuals_display_mode: r.individuals_display_mode,
      active: r.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Informe um nome", variant: "destructive" });
      return;
    }
    if (!form.combo_course_id) {
      toast({ title: "Selecione o curso combo", variant: "destructive" });
      return;
    }
    if (form.trigger_course_ids.length < 2) {
      toast({ title: "Selecione pelo menos 2 cursos individuais", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      combo_course_id: form.combo_course_id,
      trigger_course_ids: form.trigger_course_ids,
      combo_display_mode: form.combo_display_mode,
      individuals_display_mode: form.individuals_display_mode,
      active: form.active,
    };
    const { error } = form.id
      ? await supabase.from("course_combo_rules").update(payload).eq("id", form.id)
      : await supabase.from("course_combo_rules").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Regra atualizada" : "Regra criada" });
    setOpen(false);
    load();
  };

  const toggleActive = async (r: ComboRule, active: boolean) => {
    const { error } = await supabase.from("course_combo_rules").update({ active }).eq("id", r.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, active } : x)));
  };

  const remove = async (r: ComboRule) => {
    if (!confirm(`Excluir a regra "${r.name}"?`)) return;
    const { error } = await supabase.from("course_combo_rules").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Regra excluída" });
    load();
  };

  const toggleTrigger = (id: string) => {
    setForm((f) => ({
      ...f,
      trigger_course_ids: f.trigger_course_ids.includes(id)
        ? f.trigger_course_ids.filter((x) => x !== id)
        : [...f.trigger_course_ids, id],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Regras de combo automático
            </CardTitle>
            <CardDescription>
              Quando dois ou mais cursos individuais aparecerem na mesma janela (mesma unidade e datas
              sobrepostas), o curso combo é adicionado automaticamente.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova regra
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma regra configurada. Ex.: GIOB + TRVG → adicionar combo "GIOB + TRVG".
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.active ? (
                      <Badge variant="secondary"><Check className="h-3 w-3" /> Ativa</Badge>
                    ) : (
                      <Badge variant="outline"><X className="h-3 w-3" /> Inativa</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Gatilhos:</span>{" "}
                    {r.trigger_course_ids.map(courseName).join(" + ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Combo:</span> {courseName(r.combo_course_id)}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge variant="outline" className="text-xs">
                      Combo: {MODE_LABEL[r.combo_display_mode]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Individuais: {MODE_LABEL[r.individuals_display_mode]}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.active} onCheckedChange={(v) => toggleActive(r, v)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar regra" : "Nova regra de combo"}</DialogTitle>
              <DialogDescription>
                Quando todos os cursos gatilho aparecerem na mesma janela (unidade + datas sobrepostas),
                o curso combo será vinculado automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da regra</Label>
                <Input
                  placeholder="Ex.: GIOB + TRVG"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label>Curso combo (resultado)</Label>
                <Select
                  value={form.combo_course_id}
                  onValueChange={(v) => setForm({ ...form, combo_course_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o curso combo" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.unit === "sao_paulo" ? "SP" : "BSB"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cursos gatilho (2 ou mais)</Label>
                <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                  {courses
                    .filter((c) => c.id !== form.combo_course_id)
                    .map((c) => (
                      <label key={c.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/40">
                        <Checkbox
                          checked={form.trigger_course_ids.includes(c.id)}
                          onCheckedChange={() => toggleTrigger(c.id)}
                        />
                        <span className="text-sm">
                          {c.name}{" "}
                          <Badge variant="outline" className="text-xs">
                            {c.unit === "sao_paulo" ? "SP" : "BSB"}
                          </Badge>
                        </span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.trigger_course_ids.length} selecionado(s)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Exibição do combo</Label>
                  <Select
                    value={form.combo_display_mode}
                    onValueChange={(v: DisplayMode) => setForm({ ...form, combo_display_mode: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="combo_only">Apenas no combo</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Exibição dos individuais</Label>
                  <Select
                    value={form.individuals_display_mode}
                    onValueChange={(v: DisplayMode) => setForm({ ...form, individuals_display_mode: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="combo_only">Apenas no combo</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label>Regra ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
