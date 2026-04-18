import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { CopyModulesDialog } from "@/components/course/CopyModulesDialog";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { slugify, CourseModule, CourseClass, CourseUnit, ClassStatus } from "@/lib/courseHelpers";

interface ModuleDraft { id?: string; title: string; description: string; workload_hours: string; }
interface ClassDraft { id?: string; start_date: string; end_date: string; status: ClassStatus; location: string; }

const emptyModule = (): ModuleDraft => ({ title: "", description: "", workload_hours: "" });
const emptyClass = (): ClassDraft => ({ start_date: "", end_date: "", status: "proxima", location: "" });

const CourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const { user } = useAuth();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<"pos_graduacao" | "modular">("modular");
  const [unit, setUnit] = useState<CourseUnit>("sao_paulo");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState("");
  const [workloadHours, setWorkloadHours] = useState("");
  const [modality, setModality] = useState("");
  const [price, setPrice] = useState("");
  const [installments, setInstallments] = useState("");
  const [paymentMethods, setPaymentMethods] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleDraft[]>([emptyModule()]);
  const [classes, setClasses] = useState<ClassDraft[]>([emptyClass()]);
  const [copyOpen, setCopyOpen] = useState(false);

  useEffect(() => {
    if (!isNew && id) loadCourse(id);
  }, [id, isNew]);

  const loadCourse = async (courseId: string) => {
    const [{ data: c }, { data: m }, { data: cls }] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      supabase.from("course_modules").select("*").eq("course_id", courseId).order("order_index"),
      supabase.from("course_classes").select("*").eq("course_id", courseId).order("start_date"),
    ]);
    if (!c) {
      toast({ title: "Curso não encontrado", variant: "destructive" });
      navigate("/");
      return;
    }
    setName(c.name);
    setType(c.type as any);
    setUnit(((c as any).unit as CourseUnit) || "sao_paulo");
    setDescription(c.description || "");
    setHighlights(c.highlights || "");
    setWorkloadHours(c.workload_hours?.toString() || "");
    setModality(c.modality || "");
    setPrice(c.price?.toString() || "");
    setInstallments(c.installments?.toString() || "");
    setPaymentMethods(c.payment_methods || "");
    setCoverUrl(c.cover_url);
    setModules(
      (m as CourseModule[] || []).length > 0
        ? (m as CourseModule[]).map((x) => ({ id: x.id, title: x.title, description: x.description || "", workload_hours: x.workload_hours?.toString() || "" }))
        : [emptyModule()]
    );
    setClasses(
      (cls as CourseClass[] || []).length > 0
        ? (cls as CourseClass[]).map((x) => ({ id: x.id, start_date: x.start_date || "", end_date: x.end_date || "", status: x.status, location: x.location || "" }))
        : [emptyClass()]
    );
    setLoading(false);
  };

  const handleCoverUpload = async (file: File) => {
    if (!user) {
      toast({ title: "Faça login para enviar capa", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    // RLS exige que o arquivo fique dentro da pasta do próprio usuário
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("course-covers").upload(path, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data: pub } = supabase.storage.from("course-covers").getPublicUrl(path);
      setCoverUrl(pub.publicUrl);
      toast({ title: "Capa enviada" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      name: name.trim(),
      slug: slugify(name),
      type,
      unit,
      description: description.trim() || null,
      highlights: highlights.trim() || null,
      workload_hours: workloadHours ? parseInt(workloadHours) : null,
      modality: modality.trim() || null,
      price: price ? parseFloat(price) : null,
      installments: installments ? parseInt(installments) : null,
      payment_methods: paymentMethods.trim() || null,
      cover_url: coverUrl,
      created_by: user?.id,
    };

    let courseId = id!;
    if (isNew) {
      const { data, error } = await supabase.from("courses").insert(payload).select().single();
      if (error || !data) {
        toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      courseId = data.id;
    } else {
      const { error } = await supabase.from("courses").update(payload).eq("id", courseId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      // wipe and re-insert children for simplicity
      await supabase.from("course_modules").delete().eq("course_id", courseId);
      await supabase.from("course_classes").delete().eq("course_id", courseId);
    }

    const validModules = modules.filter((m) => m.title.trim());
    if (validModules.length > 0) {
      await supabase.from("course_modules").insert(
        validModules.map((m, idx) => ({
          course_id: courseId,
          title: m.title.trim(),
          description: m.description.trim() || null,
          workload_hours: m.workload_hours ? parseInt(m.workload_hours) : null,
          order_index: idx,
        }))
      );
    }

    const validClasses = classes.filter((c) => c.start_date);
    if (validClasses.length > 0) {
      await supabase.from("course_classes").insert(
        validClasses.map((c) => ({
          course_id: courseId,
          start_date: c.start_date,
          end_date: c.end_date || null,
          status: c.status,
          location: c.location.trim() || null,
        }))
      );
    }

    setSaving(false);
    toast({ title: isNew ? "Curso criado!" : "Curso atualizado!" });
    navigate(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">{isNew ? "Novo curso" : "Editar curso"}</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informações básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do curso *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v as CourseUnit)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sao_paulo">São Paulo</SelectItem>
                      <SelectItem value="brasilia">Brasília</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                      <SelectItem value="modular">Curso modular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Input value={modality} onChange={(e) => setModality(e.target.value)} placeholder="Presencial / Online / Híbrido" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
              </div>
              <div className="space-y-2">
                <Label>Destaques (um por linha)</Label>
                <Textarea rows={3} value={highlights} onChange={(e) => setHighlights(e.target.value)} maxLength={1000} placeholder="Certificação MEC&#10;Professores especialistas&#10;Material exclusivo" />
              </div>
              <div className="space-y-2">
                <Label>Capa do curso</Label>
                {coverUrl && (
                  <img src={coverUrl} alt="Capa" className="aspect-[16/9] w-full max-w-sm rounded-lg border object-cover" />
                )}
                <div>
                  <input type="file" id="cover" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("cover")?.click()}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {coverUrl ? "Trocar capa" : "Enviar capa"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Carga horária e investimento</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Carga horária total (horas)</Label>
                <Input type="number" min="0" value={workloadHours} onChange={(e) => setWorkloadHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parcelas (qtd)</Label>
                <Input type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Formas de pagamento</Label>
                <Input value={paymentMethods} onChange={(e) => setPaymentMethods(e.target.value)} placeholder="Cartão, boleto, Pix" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Turmas</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setClasses([...classes, emptyClass()])}>
                <Plus className="h-4 w-4" /> Turma
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {classes.map((c, i) => (
                <div key={i} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">Início</Label>
                    <Input type="date" value={c.start_date} onChange={(e) => { const n = [...classes]; n[i].start_date = e.target.value; setClasses(n); }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Término</Label>
                    <Input type="date" value={c.end_date} onChange={(e) => { const n = [...classes]; n[i].end_date = e.target.value; setClasses(n); }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={c.status} onValueChange={(v) => { const n = [...classes]; n[i].status = v as ClassStatus; setClasses(n); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="atual">Em andamento</SelectItem>
                        <SelectItem value="proxima">Confirmada</SelectItem>
                        <SelectItem value="aguardando_confirmacao">Aguardando confirmação</SelectItem>
                        <SelectItem value="encerrada">Encerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Local</Label>
                    <Input value={c.location} onChange={(e) => { const n = [...classes]; n[i].location = e.target.value; setClasses(n); }} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setClasses(classes.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Conteúdo programático / Módulos</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCopyOpen(true)}>
                  <Copy className="h-4 w-4" /> Copiar de outro curso
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setModules([...modules, emptyModule()])}>
                  <Plus className="h-4 w-4" /> Módulo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {modules.map((m, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                      <Input placeholder="Título do módulo" value={m.title} onChange={(e) => { const n = [...modules]; n[i].title = e.target.value; setModules(n); }} />
                      <Input type="number" min="0" placeholder="Horas" value={m.workload_hours} onChange={(e) => { const n = [...modules]; n[i].workload_hours = e.target.value; setModules(n); }} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setModules(modules.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea rows={2} placeholder="Descrição (opcional)" value={m.description} onChange={(e) => { const n = [...modules]; n[i].description = e.target.value; setModules(n); }} />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isNew ? "Criar curso" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseEditor;
