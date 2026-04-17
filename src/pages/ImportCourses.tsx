import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, FileSpreadsheet, FileImage, Upload, Loader2, Check, X, MapPin, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { slugify, CourseUnit, unitLabel } from "@/lib/courseHelpers";

interface ParsedModule { title: string; description?: string | null; workload_hours?: number | null }
interface ParsedClass { start_date?: string | null; end_date?: string | null; status: "atual" | "proxima" | "encerrada"; location?: string | null }
interface ParsedCourse {
  name: string;
  type: "pos_graduacao" | "modular";
  workload_hours?: number | null;
  price?: number | null;
  installments?: number | null;
  payment_methods?: string | null;
  modality?: string | null;
  description?: string | null;
  highlights?: string | null;
  modules: ParsedModule[];
  classes: ParsedClass[];
  _source?: string;
  _selected?: boolean;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const isSpreadsheet = (file: File) =>
  /\.(xlsx|xls|csv)$/i.test(file.name) || file.type.includes("sheet") || file.type === "text/csv";

const parseSpreadsheet = async (file: File): Promise<ParsedCourse[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

  const findKey = (obj: any, candidates: string[]): any => {
    const keys = Object.keys(obj);
    for (const c of candidates) {
      const k = keys.find((x) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(c));
      if (k) return obj[k];
    }
    return null;
  };
  const num = (v: any): number | null => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return v;
    const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };
  const dt = (v: any): string | null => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(v).trim();
    const br = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (br) {
      const yyyy = br[3].length === 2 ? `20${br[3]}` : br[3];
      return `${yyyy}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  };
  const detectType = (v: any): "pos_graduacao" | "modular" => {
    const s = String(v || "").toLowerCase();
    if (s.includes("pós") || s.includes("pos") || s.includes("graduação") || s.includes("graduacao")) return "pos_graduacao";
    return "modular";
  };

  return data
    .map((r) => {
      const start = dt(findKey(r, ["data", "inicio", "início", "start"]));
      return {
        name: String(findKey(r, ["nome", "curso", "titulo", "name"]) || "").trim(),
        type: detectType(findKey(r, ["tipo", "categoria", "type"])),
        workload_hours: num(findKey(r, ["carga", "horas", "workload", "ch"])),
        price: num(findKey(r, ["valor", "preco", "preço", "investimento", "price"])),
        modality: (findKey(r, ["modalidade", "formato", "modality"]) || "").toString().trim() || null,
        description: (findKey(r, ["descricao", "descrição", "sobre", "description"]) || "").toString().trim() || null,
        modules: [],
        classes: start ? [{ start_date: start, status: "proxima" as const }] : [],
      } as ParsedCourse;
    })
    .filter((r) => r.name);
};

const ImportCourses = () => {
  const navigate = useNavigate();
  const [unit, setUnit] = useState<CourseUnit>("sao_paulo");
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: "" });
  const [courses, setCourses] = useState<ParsedCourse[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const processAll = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress({ current: 0, total: files.length, file: "" });
    const collected: ParsedCourse[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, file: file.name });
      try {
        if (isSpreadsheet(file)) {
          const parsed = await parseSpreadsheet(file);
          parsed.forEach((c) => collected.push({ ...c, _source: file.name, _selected: true }));
        } else {
          // PDF or image -> send to edge function
          const base64 = await fileToBase64(file);
          const { data, error } = await supabase.functions.invoke("extract-course", {
            body: { fileBase64: base64, mimeType: file.type || "application/pdf", fileName: file.name },
          });
          if (error) throw new Error(error.message);
          if (data?.error) throw new Error(data.error);
          const list: ParsedCourse[] = (data?.courses || []).map((c: any) => ({
            ...c,
            modules: c.modules || [],
            classes: c.classes || [],
            _source: file.name,
            _selected: true,
          }));
          collected.push(...list);
        }
      } catch (err: any) {
        toast({ title: `Erro em ${file.name}`, description: err.message, variant: "destructive" });
      }
    }

    setProcessing(false);
    setCourses(collected);
    if (collected.length === 0) {
      toast({ title: "Nenhum curso identificado", description: "Verifique se os arquivos contêm informações de cursos.", variant: "destructive" });
    } else {
      toast({ title: `${collected.length} curso(s) detectado(s)`, description: "Confira o preview e confirme a importação." });
    }
  };

  const toggle = (idx: number) => {
    setCourses((prev) => prev.map((c, i) => (i === idx ? { ...c, _selected: !c._selected } : c)));
  };

  const handleImport = async () => {
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    let success = 0;
    const toImport = courses.filter((c) => c._selected);

    for (const row of toImport) {
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          name: row.name,
          slug: slugify(row.name),
          type: row.type,
          unit,
          workload_hours: row.workload_hours ?? null,
          price: row.price ?? null,
          installments: row.installments ?? null,
          payment_methods: row.payment_methods ?? null,
          modality: row.modality ?? null,
          description: row.description ?? null,
          highlights: row.highlights ?? null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error || !course) continue;

      if (row.modules?.length) {
        await supabase.from("course_modules").insert(
          row.modules.map((m, idx) => ({
            course_id: course.id,
            title: m.title,
            description: m.description ?? null,
            workload_hours: m.workload_hours ?? null,
            order_index: idx,
          }))
        );
      }
      if (row.classes?.length) {
        await supabase.from("course_classes").insert(
          row.classes.map((c) => ({
            course_id: course.id,
            start_date: c.start_date ?? null,
            end_date: c.end_date ?? null,
            status: c.status || "proxima",
            location: c.location ?? null,
          }))
        );
      }
      success++;
    }

    setImporting(false);
    setDone(true);
    toast({ title: `${success} curso(s) importado(s)!`, description: `Unidade: ${unitLabel(unit)}` });
    setTimeout(() => navigate("/"), 1500);
  };

  const fileIcon = (file: File) => {
    if (isSpreadsheet(file)) return <FileSpreadsheet className="h-5 w-5 text-success" />;
    if (file.type.startsWith("image/")) return <FileImage className="h-5 w-5 text-accent" />;
    return <FileText className="h-5 w-5 text-primary" />;
  };

  const selectedCount = courses.filter((c) => c._selected).length;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Importar cursos</h1>
          <p className="mt-1 text-muted-foreground">
            Envie PDFs, prints (PNG/JPG) ou planilhas (XLSX/CSV). A IA lê o conteúdo e extrai os dados automaticamente.
          </p>
        </div>

        {/* Unit selector */}
        <Card className="mb-4 border-accent/40 bg-accent/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Unidade deste lote</div>
                <p className="text-xs text-muted-foreground">Todos os cursos importados serão marcados como desta unidade.</p>
              </div>
            </div>
            <Tabs value={unit} onValueChange={(v) => setUnit(v as CourseUnit)}>
              <TabsList>
                <TabsTrigger value="sao_paulo">São Paulo</TabsTrigger>
                <TabsTrigger value="brasilia">Brasília</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {courses.length === 0 ? (
          <>
            {/* Upload area */}
            <Card>
              <CardContent className="py-10">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex gap-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <FileImage className="h-12 w-12 text-accent" />
                    <FileSpreadsheet className="h-12 w-12 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold">Selecione seus arquivos</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Aceita <strong>PDF</strong>, imagens (<strong>PNG/JPG</strong>) e planilhas (<strong>XLSX/CSV</strong>). Pode enviar vários de uma vez.
                  </p>
                  <div className="mt-6">
                    <input
                      type="file"
                      id="files"
                      multiple
                      accept=".pdf,.xlsx,.xls,.csv,image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                    <Button onClick={() => document.getElementById("files")?.click()}>
                      <Upload className="h-4 w-4" /> Escolher arquivos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {files.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">{files.length} arquivo(s) selecionado(s)</CardTitle>
                  <CardDescription>Unidade: <strong>{unitLabel(unit)}</strong></CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-3 truncate">
                        {fileIcon(f)}
                        <div className="truncate">
                          <div className="truncate text-sm font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(i)} disabled={processing}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {processing ? (
                    <div className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">Processando {progress.current}/{progress.total}</div>
                        <div className="truncate text-xs text-muted-foreground">{progress.file}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setFiles([])}>
                        Limpar
                      </Button>
                      <Button onClick={processAll}>
                        <Sparkles className="h-4 w-4" /> Extrair com IA ({files.length})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card className="mb-4">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Preview da importação</CardTitle>
                    <CardDescription>
                      {selectedCount} de {courses.length} curso(s) selecionado(s) para <strong>{unitLabel(unit)}</strong>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" /> {unitLabel(unit)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {courses.map((c, i) => (
                    <AccordionItem key={i} value={`item-${i}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!c._selected}
                          onChange={() => toggle(i)}
                          className="h-4 w-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <AccordionTrigger className="flex-1 hover:no-underline">
                          <div className="flex flex-1 items-center justify-between pr-3">
                            <div className="text-left">
                              <div className="font-medium">{c.name}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px]">
                                  {c.type === "pos_graduacao" ? "Pós" : "Modular"}
                                </Badge>
                                {c.workload_hours && <span>{c.workload_hours}h</span>}
                                {c.price && <span>R$ {c.price.toLocaleString("pt-BR")}</span>}
                                {c.modules.length > 0 && <span>{c.modules.length} módulos</span>}
                                {c.classes.length > 0 && <span>{c.classes.length} turma(s)</span>}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="space-y-3 pl-7 text-sm">
                        {c._source && <div className="text-xs text-muted-foreground">📎 De: {c._source}</div>}
                        {c.description && <p>{c.description}</p>}
                        {c.modality && <div><strong>Modalidade:</strong> {c.modality}</div>}
                        {c.installments && <div><strong>Parcelas:</strong> {c.installments}x</div>}
                        {c.payment_methods && <div><strong>Pagamento:</strong> {c.payment_methods}</div>}
                        {c.classes.length > 0 && (
                          <div>
                            <strong>Turmas:</strong>
                            <ul className="ml-4 list-disc">
                              {c.classes.map((cl, idx) => (
                                <li key={idx}>
                                  {cl.start_date || "—"} {cl.end_date && `→ ${cl.end_date}`} ({cl.status})
                                  {cl.location && ` • ${cl.location}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {c.modules.length > 0 && (
                          <div>
                            <strong>Módulos:</strong>
                            <ul className="ml-4 list-disc">
                              {c.modules.map((m, idx) => (
                                <li key={idx}>
                                  {m.title} {m.workload_hours && `(${m.workload_hours}h)`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setCourses([]); setFiles([]); }} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || done || selectedCount === 0}>
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                {done && <Check className="h-4 w-4" />}
                {done ? "Importado!" : importing ? "Importando..." : `Importar ${selectedCount} curso(s)`}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ImportCourses;
