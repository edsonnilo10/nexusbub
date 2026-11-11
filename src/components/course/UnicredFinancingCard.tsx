import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Loader2, Plus, Trash2, ImagePlus, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CourseFull, CourseClass } from "@/lib/courseHelpers";
import { formatWorkload, referenceYear } from "@/lib/whatsappTemplates";
import { unicredFinancingMessage, UnicredOption } from "@/lib/unicredMessage";

interface Props { course: CourseFull; classes: CourseClass[]; selectedClass?: CourseClass | null; year?: string }

const LIMIT = 4095;
const toDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
});
const parseNum = (s: string) => Number(s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (n: number) => (n ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

export const UnicredFinancingCard = ({ course, classes, selectedClass, year }: Props) => {
  const [cash, setCash] = useState("");
  const [rows, setRows] = useState<{ parcelas: string; valor: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const generated = useMemo(() => unicredFinancingMessage({
    courseName: course.name,
    workload: formatWorkload(course),
    year: year ?? referenceYear(classes, selectedClass),
    cashValue: parseNum(cash) || null,
    options: rows.map((r): UnicredOption => ({ parcelas: parseInt(r.parcelas, 10), valor: parseNum(r.valor) })),
  }), [course, classes, selectedClass, year, cash, rows]);

  useEffect(() => { if (!edited) setText(generated); }, [generated, edited]);

  const handleFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, 10);
    if (!imgs.length) return;
    setBusy(true);
    try {
      const images = await Promise.all(imgs.map(toDataUrl));
      const { data, error } = await supabase.functions.invoke("read-unicred-simulation", { body: { images } });
      if (error || data?.error) {
        let msg = data?.error;
        try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* */ }
        throw new Error(msg ?? "Não foi possível ler os prints.");
      }
      const results: { valor_liquido: number | null; parcelas: number | null; valor_parcela: number | null }[] = data.results;
      const cashes = [...new Set(results.map((r) => r.valor_liquido).filter((v): v is number => !!v))];
      if (cashes.length) setCash(fmt(cashes[0]));
      setWarn(cashes.length > 1 ? `Os prints mostram valores à vista diferentes: ${cashes.map(fmt).join(" / ")}. Confira.` : null);
      const added = results.filter((r) => r.parcelas && r.valor_parcela).map((r) => ({ parcelas: String(r.parcelas), valor: fmt(r.valor_parcela!) }));
      setRows((prev) => {
        const m = new Map(prev.map((p) => [p.parcelas, p]));
        added.forEach((a) => m.set(a.parcelas, a));
        return [...m.values()].sort((a, b) => +a.parcelas - +b.parcelas);
      });
      setEdited(false);
      toast({ title: `${added.length} simulação(ões) lida(s)` });
      if (added.length < results.length) toast({ title: "Algum print não pôde ser lido", description: "Preencha manualmente.", variant: "destructive" });
    } catch (e) {
      toast({ title: "Erro ao ler os prints", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = [...e.clipboardData.files];
    if (files.length) { e.preventDefault(); handleFiles(files); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card onPaste={onPaste}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> Financiamento Unicred</CardTitle>
        <CardDescription>Cole (Ctrl+V), arraste ou anexe os prints da simulação. Só o valor à vista e as parcelas vão para a mensagem.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles([...e.dataTransfer.files]); }}
        >
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Lendo prints…</> : <>
            <ImagePlus className="h-5 w-5" />
            <span>Solte os prints aqui ou cole com Ctrl+V</span>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Anexar prints</Button>
          </>}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden aria-label="Prints da simulação"
            onChange={(e) => { handleFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </div>
        {warn && <p className="text-xs text-destructive">{warn}</p>}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          <div className="space-y-1">
            <Label htmlFor={`cash-${course.id}`}>Valor à vista (R$)</Label>
            <Input id={`cash-${course.id}`} value={cash} onChange={(e) => { setCash(e.target.value); setEdited(false); }} placeholder="14.338,00" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Parcelas</Label>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="w-20" aria-label="Número de parcelas" value={r.parcelas}
                onChange={(e) => { const v = e.target.value; setRows((p) => p.map((x, j) => j === i ? { ...x, parcelas: v } : x)); setEdited(false); }} />
              <span className="text-sm text-muted-foreground">x de R$</span>
              <Input aria-label="Valor da parcela" value={r.valor}
                onChange={(e) => { const v = e.target.value; setRows((p) => p.map((x, j) => j === i ? { ...x, valor: v } : x)); setEdited(false); }} />
              <Button size="icon" variant="ghost" aria-label="Remover parcela" onClick={() => setRows((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setRows((p) => [...p, { parcelas: "", valor: "" }])}><Plus className="mr-1 h-4 w-4" /> Adicionar parcela</Button>
        </div>
        <Textarea rows={14} value={text} maxLength={LIMIT} onChange={(e) => { setText(e.target.value); setEdited(true); }} aria-label="Mensagem Unicred" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length}/{LIMIT}</span>
          <Button size="sm" onClick={copy}>{copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}Copiar</Button>
        </div>
      </CardContent>
    </Card>
  );
};
