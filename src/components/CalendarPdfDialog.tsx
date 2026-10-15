import { useState } from "react";
import jsPDF from "jspdf";
import { FileDown, Loader2 } from "lucide-react";
import nexusLogo from "@/assets/nexus-logo-official.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { loadAllCourseClasses } from "@/lib/classGroupsResolver";
import { formatClassDateRange } from "@/lib/courseHelpers";
import { COURSE_THEMES, courseThemeIds } from "@/lib/courseThemes";
import { toast } from "@/hooks/use-toast";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
type Period = "ano" | "semestre" | "trimestre" | "mes";
const GREEN: [number, number, number] = [0, 94, 67];
const GOLD: [number, number, number] = [217, 166, 38];
const DARK: [number, number, number] = [10, 33, 26];

const toDataUrl = async (src: string) => {
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.readAsDataURL(blob); });
};
const clean = (t: string) => t.replace(/[^\u0000-\u00FF\u2013\u2014\u2022]/g, "").trim();

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const CalendarPdfDialog = () => {
  const thisYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [units, setUnits] = useState<string[]>(["sao_paulo", "brasilia"]);
  const [types, setTypes] = useState<string[]>(["modular", "pos_graduacao"]);
  const [themes, setThemes] = useState<string[]>([]);
  const [year, setYear] = useState(String(thisYear + 1));
  const [period, setPeriod] = useState<Period>("ano");
  const [parts, setParts] = useState<number[]>([]);
  const [groupByTheme, setGroupByTheme] = useState(true);

  const partOptions = period === "semestre" ? ["1º semestre", "2º semestre"]
    : period === "trimestre" ? ["1º trimestre", "2º trimestre", "3º trimestre", "4º trimestre"]
    : period === "mes" ? MONTHS : [];

  const monthAllowed = (m: number) => {
    if (period === "ano" || parts.length === 0) return true;
    const size = period === "semestre" ? 6 : period === "trimestre" ? 3 : 1;
    return parts.includes(Math.floor(m / size));
  };

  const periodLabel = () => {
    if (period === "ano" || parts.length === 0) return `Ano ${year}`;
    return `${parts.sort((a, b) => a - b).map((p) => partOptions[p]).join(", ")} de ${year}`;
  };

  const generate = async () => {
    if (!units.length || !types.length) { toast({ title: "Selecione ao menos uma unidade e um tipo", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const [{ data: courses }, classes] = await Promise.all([
        supabase.from("courses").select("id,name,mnemonic,type,unit"),
        loadAllCourseClasses(),
      ]);
      const byId = new Map((courses || []).map((c: any) => [c.id, c]));
      const today = new Date().toISOString().slice(0, 10);
      const rows = classes.flatMap((cl) => {
        const c: any = byId.get(cl.course_id);
        if (!c || !cl.start_date || cl.status === "encerrada" || cl.start_date < today) return [];
        const d = new Date(cl.start_date + "T00:00:00");
        if (String(d.getFullYear()) !== year || !monthAllowed(d.getMonth())) return [];
        if (!units.includes(c.unit) || !types.includes(c.type)) return [];
        const tIds = courseThemeIds(c);
        if (themes.length && !tIds.some((t) => themes.includes(t))) return [];
        return [{ c, cl, d, tIds }];
      });
      const seen = new Set<string>();
      const unique = rows.filter((r) => { const k = `${r.c.id}|${r.cl.start_date}|${r.cl.end_date}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => a.cl.start_date!.localeCompare(b.cl.start_date!));
      if (!unique.length) { toast({ title: "Nenhuma turma encontrada com esses filtros" }); return; }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
      let logo: string | null = null; try { logo = await toDataUrl(nexusLogo); } catch { /* sem logo */ }
      let y = 0;
      const footer = () => {
        doc.setFillColor(...GREEN); doc.rect(0, H - 28, W, 28, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text("Nexus Ultrassonografia  •  Datas sujeitas a confirmação pela secretaria", M, H - 11);
        doc.text(String(doc.getNumberOfPages()), W - M, H - 11, { align: "right" });
      };
      const newPage = () => { footer(); doc.addPage(); doc.setFillColor(...GREEN); doc.rect(0, 0, W, 6, "F"); y = 40; };
      const ensure = (h: number) => { if (y + h > H - 40) newPage(); };

      doc.setFillColor(...GREEN); doc.rect(0, 0, W, 130, "F"); doc.setFillColor(...GOLD); doc.rect(0, 130, W, 3, "F");
      if (logo) doc.addImage(logo, "JPEG", M, 30, 56, 56);
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text("Calendário de Cursos", M + 72, 56);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
      const unitTxt = units.map((u) => (u === "brasilia" ? "Brasília" : "São Paulo")).join(" e ");
      const typeTxt = types.map((t) => (t === "modular" ? "Cursos modulares" : "Pós-graduação")).join(" e ");
      doc.text(clean(`${periodLabel()}  •  ${unitTxt}`), M + 72, 74);
      doc.text(clean(typeTxt + (themes.length ? `  •  ${themes.map((t) => COURSE_THEMES.find((x) => x.id === t)?.label).join(", ")}` : "")), M + 72, 90, { maxWidth: W - 2 * M - 72 });
      y = 160;

      const heading = (t: string, size = 13) => {
        ensure(40); doc.setFillColor(...GOLD); doc.rect(M, y - 10, 4, 14, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(size); doc.setTextColor(...GREEN); doc.text(clean(t), M + 12, y + 2); y += 20;
      };
      const sub = (t: string) => { ensure(30); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK); doc.text(clean(t).toUpperCase(), M, y); y += 14; };
      const line = (r: typeof unique[number], i: number) => {
        const name = doc.splitTextToSize(clean(r.c.name.replace(/^(CM|PG) [A-Z]{2} [A-Z0-9]+( [A-Z.]+)?: ?/, "")) + (r.c.type === "pos_graduacao" ? " (Pós)" : ""), W - 2 * M - 190);
        const h = Math.max(20, name.length * 12 + 8);
        ensure(h);
        if (i % 2 === 0) { doc.setFillColor(242, 248, 245); doc.rect(M, y - 12, W - 2 * M, h, "F"); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...DARK);
        doc.text(name, M + 8, y + 1);
        doc.setFont("helvetica", "bold"); doc.setTextColor(...GREEN);
        doc.text(clean(formatClassDateRange(r.cl.start_date, r.cl.end_date)), W - M - 8, y + 1, { align: "right" });
        y += h;
      };

      const unitsSel = units.length > 1 ? units : [units[0]];
      for (const u of unitsSel) {
        const uRows = unique.filter((r) => r.c.unit === u);
        if (!uRows.length) continue;
        if (unitsSel.length > 1) heading(u === "brasilia" ? "Brasília" : "São Paulo", 15);
        const groups = groupByTheme
          ? [...COURSE_THEMES.filter((t) => !themes.length || themes.includes(t.id)).map((t) => ({ label: t.label, rows: uRows.filter((r) => r.tIds.includes(t.id)) })),
             ...(!themes.length ? [{ label: "Outros", rows: uRows.filter((r) => r.tIds.includes("outros")) }] : [])]
          : [...new Set(uRows.map((r) => r.d.getMonth()))].map((m) => ({ label: `${MONTHS[m]} de ${year}`, rows: uRows.filter((r) => r.d.getMonth() === m) }));
        for (const g of groups) {
          if (!g.rows.length) continue;
          if (groupByTheme) {
            heading(g.label);
            for (const m of [...new Set(g.rows.map((r) => r.d.getMonth()))]) {
              sub(MONTHS[m]); g.rows.filter((r) => r.d.getMonth() === m).forEach(line); y += 6;
            }
          } else { heading(g.label); g.rows.forEach(line); }
          y += 8;
        }
      }
      footer();
      doc.save(`Nexus - Calendario ${periodLabel().replace(/[^\wÀ-ú ,º-]/g, "")}.pdf`);
      toast({ title: "PDF do calendário gerado" });
      setOpen(false);
    } catch {
      toast({ title: "Não foi possível gerar o PDF", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const Check = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={onChange} />{label}</label>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><FileDown className="h-4 w-4" /> PDF do calendário</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerar PDF do calendário</DialogTitle>
          <DialogDescription>Escolha os filtros. Você pode marcar mais de uma opção em cada campo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Unidade</Label>
              <Check checked={units.includes("sao_paulo")} onChange={() => setUnits(toggle(units, "sao_paulo"))} label="São Paulo" />
              <Check checked={units.includes("brasilia")} onChange={() => setUnits(toggle(units, "brasilia"))} label="Brasília" />
            </div>
            <div className="space-y-2"><Label>Tipo de curso</Label>
              <Check checked={types.includes("modular")} onChange={() => setTypes(toggle(types, "modular"))} label="Curso modular" />
              <Check checked={types.includes("pos_graduacao")} onChange={() => setTypes(toggle(types, "pos_graduacao"))} label="Pós-graduação" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Ano</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[thisYear, thisYear + 1, thisYear + 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Período</Label>
              <Select value={period} onValueChange={(v) => { setPeriod(v as Period); setParts([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ano">Ano inteiro</SelectItem>
                  <SelectItem value="semestre">Semestre</SelectItem>
                  <SelectItem value="trimestre">Trimestre</SelectItem>
                  <SelectItem value="mes">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {partOptions.length > 0 && (
            <div className="space-y-2"><Label>Quais {period === "mes" ? "meses" : period === "semestre" ? "semestres" : "trimestres"}?</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {partOptions.map((p, i) => <Check key={p} checked={parts.includes(i)} onChange={() => setParts(toggle(parts as any, i as any) as any)} label={p} />)}
              </div>
              <p className="text-xs text-muted-foreground">Sem seleção, entra o ano inteiro.</p>
            </div>
          )}
          <div className="space-y-2"><Label>Temas</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COURSE_THEMES.map((t) => <Check key={t.id} checked={themes.includes(t.id)} onChange={() => setThemes(toggle(themes, t.id))} label={t.label} />)}
            </div>
            <p className="text-xs text-muted-foreground">Sem seleção, entram todos os temas.</p>
          </div>
          <Check checked={groupByTheme} onChange={() => setGroupByTheme(!groupByTheme)} label="Separar o PDF por tema (desmarcado: por mês)" />
        </div>
        <DialogFooter>
          <Button onClick={generate} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Gerar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
