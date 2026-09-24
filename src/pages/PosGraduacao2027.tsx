import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Unlock, CheckCircle2, Copy, MapPin, GraduationCap, CalendarDays, RefreshCw, Award, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { usePersistentSelection } from "@/hooks/usePersistentSelection";
import { loadAllCourseClasses } from "@/lib/classGroupsResolver";
import { CourseClass, formatClassDateRange } from "@/lib/courseHelpers";

type Unit = "sao_paulo" | "brasilia";
interface Item { code: string; name: string; hours: number }
interface Block { id: number; title: string; subtitle: string; items: Item[] }

const BLOCKS: Block[] = [
  { id: 1, title: "Bloco 1 — Inicial", subtitle: "Cursos de entrada obrigatórios: a pós começa por qualquer um destes", items: [
    { code: "CM US GIOB", name: "Básico de US em Ginecologia e Obstetrícia", hours: 60 },
    { code: "CM US TRVG", name: "Ultrassonografia Transvaginal", hours: 30 },
    { code: "CM US MEDI", name: "Básico de Ultrassonografia Medicina Interna", hours: 60 },
    { code: "CM US POCE", name: "Essencial: ultrassom em urgências e emergências", hours: 30 },
    { code: "CM US MAMA", name: "Ultrassonografia Mamária Diagnóstica", hours: 30 },
    { code: "CM US TIRD", name: "Ultrassonografia em Tireoide com Doppler, Cervical e Glândulas salivares", hours: 20 },
  ]},
  { id: 2, title: "Bloco 2 — Intermediário", subtitle: "Liberado após concluir todo o Bloco 1", items: [
    { code: "CM US PARI", name: "Ultrassonografia da Parede Abdominal, Região Inguinal e Bolsa testicular com Doppler", hours: 30 },
    { code: "CM US DOGO", name: "Ultrassonografia com Doppler em Ginecologia e Obstetrícia", hours: 30 },
    { code: "CM US DPMI", name: "Doppler em Medicina Interna", hours: 25 },
  ]},
  { id: 3, title: "Bloco 3 — Avançado", subtitle: "Liberado após concluir todo o Bloco 2", items: [
    { code: "CM US MOR1", name: "Ultrassonografia Morfológica 1º trimestre", hours: 25 },
    { code: "CM US MOR2", name: "Ultrassonografia Morfológica 2º trimestre", hours: 25 },
    { code: "CM US MESQ", name: "Ultrassonografia do Musculoesquelético", hours: 40 },
    { code: "CM US VAMI", name: "Ultrassonografia com Doppler Venoso dos Membros Inferiores", hours: 35 },
    { code: "CM US CAVF", name: "Ultrassonografia das Artérias Carótidas, Vertebrais e Fístulas", hours: 30 },
  ]},
];
const TCC_HOURS = 20;
const TOTAL = 490;
const unitName = (u: Unit) => (u === "brasilia" ? "Brasília" : "São Paulo");

interface DbCourse { id: string; mnemonic: string | null; unit: string; description: string | null; highlights: string | null }

const PosGraduacao2027 = () => {
  const [unit, setUnit] = usePersistentSelection<Unit>("pos27_unit", "sao_paulo");
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("pos27_done") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id,mnemonic,unit,description,highlights").eq("type", "modular");
      setCourses((data as DbCourse[]) || []);
      setClasses(await loadAllCourseClasses());
    })();
  }, []);
  useEffect(() => { localStorage.setItem("pos27_done", JSON.stringify(done)); }, [done]);

  const today = new Date().toISOString().slice(0, 10);
  const info = useMemo(() => {
    const map: Record<string, { course?: DbCourse; next: CourseClass[] }> = {};
    BLOCKS.flatMap((b) => b.items).forEach((it) => {
      const course = courses.find((c) => c.unit === unit && (c.mnemonic || "").toUpperCase() === it.code);
      const next = course
        ? classes.filter((cl) => cl.course_id === course.id && cl.status !== "encerrada" && (cl.start_date || "") >= today)
            .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || "")).slice(0, 3)
        : [];
      map[it.code] = { course, next };
    });
    return map;
  }, [courses, classes, unit, today]);

  const key = (code: string) => `${unit}:${code}`;
  const blockDone = (b: Block) => b.items.every((i) => done[key(i.code)]);
  const unlocked = (id: number) => id === 1 || BLOCKS.filter((b) => b.id < id).every(blockDone);
  const hoursDone = BLOCKS.flatMap((b) => b.items).filter((i) => done[key(i.code)]).reduce((s, i) => s + i.hours, 0);

  const nextDateLine = (code: string) => {
    const n = info[code]?.next[0];
    return n ? formatClassDateRange(n.start_date, n.end_date) : "data a confirmar";
  };

  const messages = useMemo(() => {
    const city = unitName(unit);
    const b1 = BLOCKS[0].items.map((i) => `• ${i.code.replace("CM US ", "")} – ${i.name} (${i.hours}h) — próxima: ${nextDateLine(i.code)}`).join("\n");
    const grade = BLOCKS.map((b) => `*${b.title}*\n${b.items.map((i) => `• ${i.name} (${i.hours}h)`).join("\n")}`).join("\n\n");
    return [
      { title: "Abordagem curta", text:
`Olá, Dr(a)! 👋\n\nA *Pós-Graduação em Ultrassonografia Geral 2027* da Nexus, *certificada pelo MEC*, abre turma em *${city}* a partir de *janeiro/2027*.\n\n✅ Até *18 meses* para concluir\n✅ Você monta o cronograma conforme sua rotina\n✅ *1 troca de data grátis* por módulo\n✅ ${TOTAL}h de formação prática\n\nPosso te enviar a grade completa?` },
      { title: "Apresentação completa", text:
`🎓 *PÓS-GRADUAÇÃO EM ULTRASSONOGRAFIA GERAL – NEXUS 2027*\n📍 *Turma ${city}* | Chancela *MEC*\n🕒 *Carga horária:* ${TOTAL}h\n\n*Por que escolher:*\n✔️ Duração de até *18 meses*\n✔️ Flexibilidade total: você escolhe as datas de cada módulo\n✔️ Datas confirmadas com *1 mês de antecedência*\n✔️ *1 remarcação sem custo* por módulo\n✔️ Toda a pós cursada em ${city}\n\n${grade}\n\n*Finalização*\n• TCC – Trabalho de Conclusão de Curso (${TCC_HOURS}h)\n\n_A progressão é por blocos: conclui o Bloco 1, depois o 2 e então o 3._` },
      { title: "Como começar (cursos de entrada)", text:
`Dr(a), para iniciar a pós em *${city}* você começa por qualquer curso do *Bloco 1*:\n\n${b1}\n\nVocê escolhe o que encaixa melhor na sua agenda — e ainda tem *1 troca de data gratuita* por módulo. 😉` },
      { title: "Quebra de objeção (tempo/rotina)", text:
`Entendo a rotina corrida, Dr(a)! Por isso a pós foi pensada para ser *flexível*:\n\n🗓️ Até *18 meses* para concluir\n📌 Você monta seu próprio cronograma\n🔁 *1 troca de data grátis* por módulo\n📣 Datas confirmadas com 1 mês de antecedência\n🏛️ Certificação reconhecida pelo *MEC*\n\nAssim você se especializa sem parar sua agenda de plantões e consultório.` },
    ];
  }, [unit, info]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Mensagem copiada" }); };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container space-y-6 py-4 sm:py-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><GraduationCap className="h-4 w-4" /> Chancela MEC · início jan/2027</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pós-Graduação em Ultrassonografia Geral 2027</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {TOTAL}h</Badge>
            <Badge variant="secondary" className="gap-1"><CalendarDays className="h-3 w-3" /> Até 18 meses</Badge>
            <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" /> 1 troca grátis por módulo</Badge>
            <Badge variant="secondary" className="gap-1"><Award className="h-3 w-3" /> Datas confirmadas 1 mês antes</Badge>
          </div>
        </div>

        <Card className="border-primary/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">Praça da turma (obrigatório)</div>
              <p className="text-sm text-muted-foreground">O aluno cursa toda a pós em uma única cidade — não é possível mesclar.</p>
            </div>
            <Tabs value={unit} onValueChange={(v) => setUnit(v as Unit)}>
              <TabsList>
                <TabsTrigger value="sao_paulo" className="gap-1"><MapPin className="h-3.5 w-3.5" /> Turma São Paulo</TabsTrigger>
                <TabsTrigger value="brasilia" className="gap-1"><MapPin className="h-3.5 w-3.5" /> Turma Brasília</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Simulador de progresso ({unitName(unit)}): marque os módulos concluídos.</span>
          <span className="font-semibold">{hoursDone + (unlocked(4) && done[key("TCC")] ? TCC_HOURS : 0)}h / {TOTAL}h</span>
        </div>

        <div className="space-y-4">
          {BLOCKS.map((b) => {
            const open = unlocked(b.id);
            return (
              <Card key={b.id} className={open ? "" : "opacity-60"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {blockDone(b) ? <CheckCircle2 className="h-5 w-5 text-primary" /> : open ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                    {b.title}
                    <Badge variant="outline">{b.items.reduce((s, i) => s + i.hours, 0)}h</Badge>
                  </CardTitle>
                  <CardDescription>{open ? b.subtitle : `🔒 Bloqueado — conclua o Bloco ${b.id - 1} para liberar`}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {b.items.map((it) => {
                    const inf = info[it.code];
                    return (
                      <div key={it.code} className="flex gap-3 rounded-lg border p-3">
                        <Checkbox disabled={!open} checked={!!done[key(it.code)]}
                          onCheckedChange={(v) => setDone((d) => ({ ...d, [key(it.code)]: !!v }))} className="mt-1" />
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{it.code}</Badge>
                            <span className="text-xs text-muted-foreground">{it.hours}h</span>
                          </div>
                          {inf?.course ? (
                            <Link to={`/courses/${inf.course.id}`} className="mt-1 block font-medium hover:text-primary">{it.name}</Link>
                          ) : (
                            <div className="mt-1 font-medium">{it.name} <span className="text-xs text-destructive">(não cadastrado em {unitName(unit)})</span></div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {inf?.next.length ? inf.next.map((n) => formatClassDateRange(n.start_date, n.end_date)).join(" · ") : "Datas a confirmar"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
          <Card className={unlocked(4) ? "" : "opacity-60"}>
            <CardContent className="flex items-center gap-3 p-4">
              <Checkbox disabled={!unlocked(4)} checked={!!done[key("TCC")]} onCheckedChange={(v) => setDone((d) => ({ ...d, [key("TCC")]: !!v }))} />
              {unlocked(4) ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <div className="font-medium">TCC — Trabalho de Conclusão de Curso</div>
              <Badge variant="outline">{TCC_HOURS}h</Badge>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold">Mensagens de venda — Turma {unitName(unit)}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {messages.map((m) => (
              <Card key={m.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => copy(m.text)}><Copy className="h-4 w-4" /> Copiar</Button>
                </CardHeader>
                <CardContent><Textarea readOnly value={m.text} className="min-h-[220px] text-sm" /></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PosGraduacao2027;
