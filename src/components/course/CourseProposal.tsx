import { useMemo, useRef, useState, useEffect } from "react";
import { Download, Loader2, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseFull, CourseModule, CourseClass, formatBRL, unitLabel, formatClassDateRange, classStatusLabel } from "@/lib/courseHelpers";
import nexusBrand from "@/assets/nexus-logo-official.jpg";
import { toast } from "@/hooks/use-toast";
import { useCourseOverrides } from "@/hooks/useCourseOverrides";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

const formatLong = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} | ${days[d.getDay()]}`;
};

export const CourseProposal = ({ course, modules, classes }: Props) => {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { overrides, loaded, save } = useCourseOverrides(course.id);

  const defaultPrice = course.price ? formatBRL(course.price).replace("R$", "").trim() : "0,00";
  const nextClass = useMemo(
    () => classes.find((c) => c.status === "atual") || classes.find((c) => c.status === "proxima") || classes[0] || null,
    [classes]
  );

  // Valores editáveis (preferem o que o usuário salvou; senão, fallback)
  const [priceValue, setPriceValue] = useState<string>(defaultPrice);
  const [installments, setInstallments] = useState<number>(course.installments || 1);
  const [startDate, setStartDate] = useState<string>(nextClass?.start_date || "");
  const [endDate, setEndDate] = useState<string>(nextClass?.end_date || "");
  const [coordinators, setCoordinators] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("manual");

  // Quando overrides carregam, aplica valores salvos do usuário
  useEffect(() => {
    if (!loaded) return;
    setPriceValue(overrides.proposal_price ?? defaultPrice);
    setInstallments(overrides.proposal_installments ?? course.installments ?? 1);
    const initStart = overrides.proposal_start_date ?? nextClass?.start_date ?? "";
    const initEnd = overrides.proposal_end_date ?? nextClass?.end_date ?? "";
    setStartDate(initStart);
    setEndDate(initEnd);
    setCoordinators(overrides.proposal_coordinators ?? "");
    // prefere ID salvo; senão tenta casar por datas
    const fromId = overrides.proposal_class_id && classes.find((c) => c.id === overrides.proposal_class_id);
    const match = fromId || classes.find((c) => c.start_date === initStart && (c.end_date || "") === (initEnd || ""));
    setSelectedClassId(match?.id ?? "manual");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const handleClassChange = (id: string) => {
    setSelectedClassId(id);
    if (id === "manual") {
      save({ proposal_class_id: null });
      return;
    }
    const c = classes.find((x) => x.id === id);
    if (!c) return;
    const s = c.start_date || "";
    const e = c.end_date || "";
    setStartDate(s);
    setEndDate(e);
    save({ proposal_start_date: s || null, proposal_end_date: e || null, proposal_class_id: id });
  };

  // Turma selecionada (para exibir nome/local na proposta)
  const selectedClass = useMemo(
    () => (selectedClassId !== "manual" ? classes.find((c) => c.id === selectedClassId) : null),
    [selectedClassId, classes]
  );

  // Cálculo de parcelamento
  const parsePrice = (s: string): number => {
    const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  };
  const totalPrice = parsePrice(priceValue);
  const installmentValue = installments > 0 ? totalPrice / installments : totalPrice;

  // Gera lista de dias entre startDate e endDate
  const courseDays = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const end = endDate ? new Date(endDate + "T00:00:00") : start;
    const days: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const handleDownload = async () => {
    if (!proposalRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await (html2pdf() as any)
        .set({
          margin: 0,
          filename: `Proposta_${course.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(proposalRef.current)
        .save();
      toast({ title: "Proposta baixada", description: "PDF salvo com sucesso. Já dá pra mandar no WhatsApp." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Painel de edição */}
      <Card className="border-primary/20 bg-primary/5 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Personalize a proposta</h3>
            <p className="text-xs text-muted-foreground">
              Edite o valor e as datas — suas alterações são <strong>salvas automaticamente</strong> só na sua conta.
            </p>
          </div>
          <Button onClick={handleDownload} disabled={downloading} size="lg" className="shrink-0">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar PDF
          </Button>
        </div>
        {classes.length > 0 && (
          <div className="mb-3">
            <Label className="text-xs">Turma</Label>
            <Select value={selectedClassId} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma cadastrada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">✏️ Datas personalizadas (manual)</SelectItem>
                {classes
                  .filter((c) => c.start_date)
                  .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatClassDateRange(c.start_date, c.end_date)} — {classStatusLabel(c.status)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Escolha uma turma da aba <strong>Turmas</strong> para preencher as datas automaticamente.
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Valor total (R$)</Label>
            <Input
              value={priceValue}
              onChange={(e) => {
                setPriceValue(e.target.value);
                save({ proposal_price: e.target.value });
              }}
              placeholder="3.990,00"
            />
          </div>
          <div>
            <Label className="text-xs">Parcelas (sem juros)</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={installments}
              onChange={(e) => {
                const n = Math.max(1, Math.min(24, parseInt(e.target.value) || 1));
                setInstallments(n);
                save({ proposal_installments: n });
              }}
            />
            {totalPrice > 0 && installments > 1 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {installments}x de <strong>{formatBRL(installmentValue)}</strong>
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Data início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedClassId("manual");
                save({ proposal_start_date: e.target.value || null });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Data fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedClassId("manual");
                save({ proposal_end_date: e.target.value || null });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Coordenadores (opcional)</Label>
            <Input
              value={coordinators}
              onChange={(e) => {
                setCoordinators(e.target.value);
                save({ proposal_coordinators: e.target.value });
              }}
              placeholder="Dr. Fulano | Dra. Ciclana"
            />
          </div>
        </div>
      </Card>

      {/* Preview da proposta — capturada para PDF */}
      <div className="overflow-x-auto">
        <div
          ref={proposalRef}
          className="proposal-doc mx-auto bg-white text-[#0a3d2e]"
          style={{ width: "210mm", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          {/* PAGE 1 — Capa */}
          <section className="proposal-page relative overflow-hidden" style={pageStyle}>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#f3f8f5_0%,#dceee6_28%,#75b79b_62%,#0d6b4f_100%)]" />
            <div className="absolute -left-[22mm] top-[22mm] h-[150mm] w-[150mm] rounded-full border-[18mm] border-white/18" />
            <div className="absolute right-[-10mm] top-[-18mm] h-[120mm] w-[120mm] rounded-full bg-white/10 blur-[2px]" />
            <div className="absolute bottom-[-28mm] right-[12mm] h-[140mm] w-[140mm] rounded-full border-[22mm] border-white/12" />
            <div className="absolute inset-y-0 left-0 w-[18mm] bg-[#003d2a]" />

            <div className="absolute right-[15mm] top-[15mm] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <img
                src={nexusBrand}
                alt="Nexus"
                className="block h-[30mm] w-[30mm] object-cover"
                crossOrigin="anonymous"
              />
            </div>

            <div className="absolute bottom-[25mm] left-[28mm] w-[138mm] rounded-[10mm] bg-[#0d6b4f]/92 p-9 shadow-2xl backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d7efe4]">
                Proposta de curso
              </div>
              <h1 className="mt-3 text-[36px] font-bold leading-[1.08] text-white">{course.name}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 ring-1 ring-white/25">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-medium text-white">Unidade {unitLabel(course.unit)}</span>
                </div>
                {selectedClass && selectedClass.start_date && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 ring-1 ring-white/25">
                    <span className="text-xs font-semibold text-white">
                      Turma: {formatClassDateRange(selectedClass.start_date, selectedClass.end_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* PAGE 2 — Manifesto */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="absolute right-[-30mm] top-[-30mm] h-[120mm] w-[120mm] rounded-full bg-[#0d6b4f]/8" />
            <div className="absolute bottom-[-40mm] left-[-40mm] h-[140mm] w-[140mm] rounded-full bg-[#0d6b4f]/6" />
            <div className="relative grid h-full grid-cols-[1fr_60mm]">
              <div className="flex flex-col justify-center p-[20mm]">
                <img src={nexusBrand} alt="Nexus" className="mb-8 h-[18mm] w-[18mm] rounded-lg object-cover shadow-md" crossOrigin="anonymous" />
                <h2 className="text-[26px] font-bold leading-tight text-[#0d6b4f]">
                  Nexus: Sua jornada para a excelência em ultrassonografia começa aqui.
                </h2>
                <p className="mt-6 text-[14px] leading-relaxed text-neutral-700">
                  Na Nexus, acreditamos que a excelência é mais do que uma palavra, é um compromisso
                  com você. Oferecemos um ambiente acolhedor e personalizado, onde você, médico, é o
                  protagonista da sua jornada de aprendizado.
                </p>
              </div>
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0d6b4f] to-[#003d2a] p-[10mm]">
                <img src={nexusBrand} alt="Nexus" className="h-[44mm] w-[44mm] rounded-2xl object-cover shadow-2xl ring-4 ring-white/30" crossOrigin="anonymous" />
              </div>
            </div>
          </section>

          {/* PAGE 3 — A Escola */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="absolute left-0 top-0 h-[8mm] w-full bg-[#0d6b4f]" />
            <div className="absolute bottom-0 right-0 h-[60mm] w-[60mm] rounded-tl-[60mm] bg-[#0d6b4f]/10" />
            <div className="relative flex h-full flex-col justify-center p-[20mm]">
              <h2 className="text-[34px] font-bold text-[#0d6b4f]">A ESCOLA</h2>
              <div className="mt-2 h-1 w-16 bg-[#0d6b4f]" />
              <p className="mt-8 max-w-[140mm] text-[14px] leading-relaxed text-neutral-700">
                Somos uma escola de ultrassonografia diferenciada, formada por docentes qualificados,
                médicos atuantes que são referência em suas áreas, com sólida e extensa formação
                acadêmica.
              </p>
              <p className="mt-4 max-w-[140mm] text-[14px] leading-relaxed text-neutral-700">
                Temos um compromisso com a excelência no ensino da ultrassonografia. Por isso, além
                da teoria densa, detalhada e atualizada, na Nexus, o aluno médico tem a oportunidade
                de trocar experiências com profissionais professores reconhecidos não só na área
                acadêmica, mas também na clínica médica.
              </p>
              <div className="mt-12 flex items-center gap-4">
                <img src={nexusBrand} alt="Nexus" className="h-[20mm] w-[20mm] rounded-xl object-cover shadow-md ring-2 ring-[#0d6b4f]/20" crossOrigin="anonymous" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0d6b4f]">Escola Nexus</div>
                  <div className="text-sm font-bold text-neutral-700">Ultrassonografia de Excelência</div>
                </div>
              </div>
            </div>
          </section>

          {/* PAGE 4 — Por que escolher */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="p-[20mm]">
              <img src={nexusBrand} alt="Nexus" className="mb-6 h-[14mm] w-[14mm] rounded-lg object-cover shadow-md" crossOrigin="anonymous" />
              <h2 className="text-[30px] font-bold text-[#0d6b4f]">Por que escolher a Nexus?</h2>
              <div className="mt-2 h-1 w-16 bg-[#0d6b4f]" />
              <ul className="mt-10 space-y-5 text-[13px] leading-relaxed text-neutral-800">
                {[
                  ["Prática Intensiva", "Realize o maior número de exames em pacientes reais, sob a supervisão de professores renomados."],
                  ["Metodologia Inovadora", "Aprenda através de casos clínicos reais e desenvolva suas habilidades de diagnóstico."],
                  ["Corpo Docente de Referência", "Conte com mestres e doutores que são referência em suas áreas de atuação."],
                  ["Tecnologia de Ponta", "Utilize equipamentos de última geração para aprimorar suas técnicas."],
                  ["Acompanhamento Individualizado", "Tenha acesso a professores e monitores sempre que precisar."],
                  ["Ambiente Acolhedor", "Sinta-se em casa em nossa escola e faça parte de uma comunidade de aprendizado."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0d6b4f]" />
                    <div>
                      <span className="font-bold text-[#0d6b4f]">{t}: </span>
                      <span>{d}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* PAGE 5 — Diferenciais */}
          <section className="proposal-page relative bg-[#f3f8f5]" style={pageStyle}>
            <div className="p-[20mm]">
              <h2 className="text-[26px] font-bold leading-tight text-[#0d6b4f]">
                Na Nexus, você não apenas aprende, você evolui.
              </h2>
              <div className="mt-2 h-1 w-16 bg-[#0d6b4f]" />
              <div className="mt-10 grid grid-cols-2 gap-6">
                {[
                  ["Maior Carga Horária de Prática", "Apenas 2 alunos/máquina. Aqui você faz mais exames e ganha mais tempo de máquina."],
                  ["Monitoria Especializada", "Conte com o apoio de médicos especialistas durante todo o curso."],
                  ["Turmas Reduzidas", "Atendimento personalizado para garantir seu aprendizado."],
                  ["Infraestrutura Completa", "Tudo o que você precisa para estudar e praticar."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl border-l-4 border-[#0d6b4f] bg-white p-5 shadow-sm">
                    <h3 className="text-[15px] font-bold text-[#0d6b4f]">{t}</h3>
                    <p className="mt-2 text-[12px] leading-relaxed text-neutral-700">{d}</p>
                  </div>
                ))}
              </div>
              {course.workload_hours && (
                <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#0d6b4f] px-6 py-3 text-white">
                  <span className="text-sm font-semibold">Carga horária total:</span>
                  <span className="text-lg font-bold">{course.workload_hours}h</span>
                </div>
              )}
            </div>
          </section>

          {/* PAGE 6 — Programa do curso */}
          <section className="proposal-page relative bg-[#f3f8f5]" style={pageStyle}>
            <div className="p-[18mm]">
              <h2 className="text-center text-[24px] font-bold uppercase text-[#0d6b4f]">
                {course.name}
              </h2>
              {coordinators && (
                <div className="mt-4 text-center">
                  <div className="text-sm font-bold text-[#0d6b4f]">Coordenadores:</div>
                  <div className="text-sm text-neutral-700">{coordinators}</div>
                </div>
              )}

              {selectedClass && selectedClass.start_date ? (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="rounded-full bg-[#0d6b4f] px-6 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md">
                    Turma {classStatusLabel(selectedClass.status)}
                  </div>
                  <div className="rounded-full bg-[#bfe3d0] px-6 py-2 text-sm font-bold text-[#0d6b4f]">
                    {formatClassDateRange(selectedClass.start_date, selectedClass.end_date)}
                  </div>
                  {selectedClass.location && (
                    <div className="text-xs text-neutral-600">📍 {selectedClass.location}</div>
                  )}
                </div>
              ) : courseDays.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <div className="rounded-full bg-[#bfe3d0] px-6 py-2 text-sm font-bold text-[#0d6b4f]">
                    {formatLong(courseDays[0])}
                    {courseDays.length > 1 && ` → ${formatLong(courseDays[courseDays.length - 1])}`}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3">
                {modules.length === 0 ? (
                  <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500">
                    Nenhum módulo cadastrado ainda. Adicione módulos na aba "Informações" para
                    aparecerem aqui automaticamente.
                  </div>
                ) : (
                  modules.map((m, i) => {
                    // Parse description as bullet points if it contains line breaks or semicolons
                    const desc = (m.description || "").trim();
                    const bullets = desc
                      ? desc
                          .split(/\n+|;\s*/)
                          .map((s) => s.replace(/^[-•·*]\s*/, "").trim())
                          .filter(Boolean)
                      : [];

                    return (
                      <div key={m.id} className="overflow-hidden rounded-xl border border-[#0d6b4f]/20 bg-white shadow-sm">
                        <div className="flex items-center gap-3 bg-[#0d6b4f] px-4 py-2.5 text-white">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1 text-sm font-bold leading-snug">{m.title}</div>
                          {m.workload_hours ? (
                            <div className="shrink-0 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-semibold">
                              {m.workload_hours}h
                            </div>
                          ) : null}
                        </div>
                        {bullets.length > 0 && (
                          <ul className="space-y-1.5 px-5 py-3 text-[12px] leading-relaxed text-neutral-700">
                            {bullets.map((b, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d6b4f]" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* PAGE 7 — Valor */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="absolute right-[10mm] top-[10mm] h-[80mm] w-[80mm] rounded-full border-[18mm] border-[#bfe3d0]/40" />
            <div className="absolute bottom-[10mm] left-[10mm] h-[100mm] w-[100mm] rounded-full border-[20mm] border-[#0d6b4f]/30" />
            <div className="relative flex h-full items-center justify-center p-[20mm]">
              <div className="w-full max-w-[150mm] rounded-3xl border-2 border-[#0d6b4f] bg-white p-[18mm] text-center shadow-xl">
                <div className="text-[18px] font-bold text-[#0d6b4f]">Investimento</div>
                <div className="mt-5 inline-block rounded-2xl bg-gradient-to-br from-[#0d6b4f] to-[#003d2a] px-10 py-6 text-white shadow-lg">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#bfe3d0]">
                    Valor total
                  </div>
                  <div className="mt-1 text-[44px] font-extrabold leading-none">R$ {priceValue}</div>
                </div>
                {installments > 1 && totalPrice > 0 && (
                  <div className="mt-6 inline-block rounded-2xl border-2 border-dashed border-[#0d6b4f] bg-[#f3f8f5] px-8 py-5">
                    <div className="text-[12px] font-semibold uppercase tracking-wider text-[#0d6b4f]">
                      Ou parcele em
                    </div>
                    <div className="mt-1 text-[28px] font-extrabold leading-none text-[#0d6b4f]">
                      {installments}x de {formatBRL(installmentValue)}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-600">sem juros</div>
                  </div>
                )}
                {course.payment_methods && (
                  <div className="mt-5 text-xs text-neutral-500">{course.payment_methods}</div>
                )}
              </div>
            </div>
          </section>

          {/* PAGE 8 — Contato */}
          <section
            className="proposal-page relative flex flex-col items-center justify-center text-white"
            style={{ ...pageStyle, background: "linear-gradient(135deg, #003d2a 0%, #0d6b4f 60%, #0a5a40 100%)" }}
          >
            <h2 className="text-[42px] font-extrabold uppercase tracking-tight">Vamos juntos?</h2>
            <p className="mt-3 text-lg">Fale com nossos consultores</p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-white/15 px-8 py-4 ring-1 ring-white/30 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0d6b4f]">
                <Phone className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold">(61) 9904-2880</span>
            </div>
            <div className="mt-20 overflow-hidden rounded-2xl shadow-xl ring-2 ring-white/40">
              <img src={nexusBrand} alt="Nexus" className="block h-[36mm] w-[36mm] object-cover" crossOrigin="anonymous" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm opacity-90">
              <MapPin className="h-4 w-4" />
              <span>
                {course.unit === "brasilia"
                  ? "SCRN 502 Bloco B – Sala 101 | Asa Norte – Brasília, DF"
                  : `Unidade ${unitLabel(course.unit)}`}
              </span>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .proposal-page {
          page-break-after: always;
          break-after: page;
        }
        .proposal-page:last-child {
          page-break-after: auto;
        }
      `}</style>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  width: "210mm",
  height: "297mm",
  position: "relative",
  overflow: "hidden",
};
