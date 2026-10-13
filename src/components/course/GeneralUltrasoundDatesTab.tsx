import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CourseFull } from "@/lib/courseHelpers";
import { loadAllCourseClasses } from "@/lib/classGroupsResolver";
import { generalUltrasoundBlocks, generalUltrasoundBlockMessage } from "@/lib/generalUltrasoundBlocks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const BlockMessage = ({ text }: { text: string }) => {
  const [edited, setEdited] = useState(text);
  return <div className="space-y-3">
    <Textarea aria-label="Mensagem do bloco" value={edited} maxLength={4095} onChange={e => setEdited(e.target.value)} className="min-h-[420px] text-sm leading-relaxed" />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{edited.length.toLocaleString("pt-BR")} / 4.095 caracteres</span>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" title="Restaurar mensagem" aria-label="Restaurar mensagem" onClick={() => setEdited(text)}><RotateCcw className="h-4 w-4" /></Button>
        <Button onClick={async () => {
          try { await navigator.clipboard.writeText(edited); toast({ title: "Mensagem copiada" }); }
          catch { toast({ title: "Não foi possível copiar a mensagem", variant: "destructive" }); }
        }}><Copy className="h-4 w-4" /> Copiar mensagem</Button>
      </div>
    </div>
  </div>;
};

export const GeneralUltrasoundDatesTab = ({ course }: { course: CourseFull }) => {
  const [year, setYear] = useState("2027");
  const query = useQuery({
    queryKey: ["general-ultrasound-block-dates", course.unit],
    queryFn: async () => {
      const [result, classes] = await Promise.all([
        supabase.from("courses").select("id,mnemonic,unit").eq("unit", course.unit).eq("type", "modular"),
        loadAllCourseClasses(),
      ]);
      if (result.error) throw result.error;
      return { courses: result.data, classes };
    },
  });
  if (query.isPending) return <div className="flex justify-center py-16"><Loader2 aria-label="Carregando datas" className="h-6 w-6 animate-spin text-primary" /></div>;
  if (query.isError) return <div className="space-y-3"><p>Não foi possível carregar as datas.</p><Button onClick={() => query.refetch()}>Tentar novamente</Button></div>;
  const years = [...new Set([2027, ...query.data.classes.filter(c => query.data.courses.some(course => course.id === c.course_id)).flatMap(c => c.start_date && Number(c.start_date.slice(0, 4)) >= 2027 ? [Number(c.start_date.slice(0, 4))] : [])])].sort();
  return <section className="max-w-3xl space-y-5">
    <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Datas por bloco · {course.unit === "brasilia" ? "Brasília" : "São Paulo"}</h2>
      <Select value={year} onValueChange={setYear}><SelectTrigger aria-label="Ano das datas" className="w-28 shrink-0"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
    </div>
    <Tabs defaultValue="0">
      <TabsList className="grid h-auto w-full grid-cols-3">{generalUltrasoundBlocks.map((_, i) => <TabsTrigger key={i} value={String(i)}>Bloco {i + 1}</TabsTrigger>)}</TabsList>
      {generalUltrasoundBlocks.map((block, i) => <TabsContent key={i} value={String(i)} className="space-y-3"><h3 className="font-medium">{block.label}</h3><BlockMessage key={`${course.id}-${year}-${i}-${query.dataUpdatedAt}`} text={generalUltrasoundBlockMessage(i, course.unit, Number(year), query.data.courses, query.data.classes)} /></TabsContent>)}
    </Tabs>
  </section>;
};