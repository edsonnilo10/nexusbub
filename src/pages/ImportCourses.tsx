import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Upload, Loader2, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/courseHelpers";

interface ParsedRow {
  name: string;
  type: "pos_graduacao" | "modular";
  workload_hours: number | null;
  price: number | null;
  modality: string | null;
  description: string | null;
  start_date: string | null;
}

// Try to extract a numeric value from messy strings like "R$ 2.500,00"
const parseNumber = (v: any): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const parseDate = (v: any): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy
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

const findKey = (obj: any, candidates: string[]): any => {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const k = keys.find((x) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(c));
    if (k) return obj[k];
  }
  return null;
};

const ImportCourses = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      const parsed: ParsedRow[] = data
        .map((r) => ({
          name: String(findKey(r, ["nome", "curso", "titulo", "name"]) || "").trim(),
          type: detectType(findKey(r, ["tipo", "categoria", "type"])),
          workload_hours: parseNumber(findKey(r, ["carga", "horas", "workload", "ch"])),
          price: parseNumber(findKey(r, ["valor", "preco", "preço", "investimento", "price"])),
          modality: (findKey(r, ["modalidade", "formato", "modality"]) || "").toString().trim() || null,
          description: (findKey(r, ["descricao", "descrição", "sobre", "description"]) || "").toString().trim() || null,
          start_date: parseDate(findKey(r, ["data", "inicio", "início", "start"])),
        }))
        .filter((r) => r.name);
      if (parsed.length === 0) {
        toast({ title: "Nenhum curso encontrado", description: "Verifique se a planilha tem uma coluna com o nome do curso.", variant: "destructive" });
        return;
      }
      setRows(parsed);
      toast({ title: `${parsed.length} cursos detectados`, description: "Confira o preview e confirme a importação." });
    } catch (err: any) {
      toast({ title: "Erro ao ler arquivo", description: err.message, variant: "destructive" });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    let success = 0;
    for (const row of rows) {
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          name: row.name,
          slug: slugify(row.name),
          type: row.type,
          workload_hours: row.workload_hours,
          price: row.price,
          modality: row.modality,
          description: row.description,
          created_by: user?.id,
        })
        .select()
        .single();
      if (!error && course && row.start_date) {
        await supabase.from("course_classes").insert({
          course_id: course.id,
          start_date: row.start_date,
          status: "proxima",
        });
      }
      if (!error) success++;
    }
    setImporting(false);
    setDone(true);
    toast({ title: `${success} cursos importados!` });
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Importar planilha</h1>
          <p className="mt-1 text-muted-foreground">Suporta XLSX e CSV. Detectamos automaticamente colunas de nome, tipo, carga horária, valor e datas.</p>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <FileSpreadsheet className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">Selecione sua planilha</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Cabeçalhos sugeridos: <strong>Nome</strong>, <strong>Tipo</strong>, <strong>Carga horária</strong>, <strong>Valor</strong>, <strong>Modalidade</strong>, <strong>Descrição</strong>, <strong>Data de início</strong>.
                </p>
                <div className="mt-6">
                  <input
                    type="file"
                    id="xlsx"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                  <Button onClick={() => document.getElementById("xlsx")?.click()}>
                    <Upload className="h-4 w-4" /> Escolher arquivo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Preview da importação</CardTitle>
                <CardDescription>{rows.length} cursos prontos para importar.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>CH</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Início</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.type === "pos_graduacao" ? "Pós" : "Modular"}</TableCell>
                        <TableCell>{r.workload_hours || "—"}</TableCell>
                        <TableCell>{r.price ? `R$ ${r.price.toFixed(2)}` : "—"}</TableCell>
                        <TableCell>{r.modality || "—"}</TableCell>
                        <TableCell>{r.start_date || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRows([])} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || done}>
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                {done && <Check className="h-4 w-4" />}
                {done ? "Importado!" : importing ? "Importando..." : `Importar ${rows.length} cursos`}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ImportCourses;
