import { useRef, useState } from "react";
import { Download, Copy, Maximize2, Stethoscope, Clock, Calendar, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseFull, CourseModule, CourseClass, formatBRL, formatDate, courseTypeLabel } from "@/lib/courseHelpers";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

export const CourseLandingTab = ({ course, modules, classes }: Props) => {
  const landingRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);
  const ordered = [...classes].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  const nextClass = ordered.find((c) => c.status === "atual") || ordered.find((c) => c.status === "proxima") || ordered[0];

  const highlights = (course.highlights || "").split("\n").map((s) => s.trim()).filter(Boolean);

  const handleExportPdf = async () => {
    if (!landingRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(landingRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${course.slug || course.name}.pdf`);
      toast({ title: "PDF exportado!" });
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleFullscreen = () => {
    if (landingRef.current?.requestFullscreen) {
      landingRef.current.requestFullscreen();
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleFullscreen}>
          <Maximize2 className="h-4 w-4" /> Apresentação
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
          <Download className="h-4 w-4" /> {exporting ? "Exportando..." : "Exportar PDF"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Copy className="h-4 w-4" /> Copiar link
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div ref={landingRef} className="bg-background">
          {/* HERO */}
          <div className="relative overflow-hidden bg-gradient-hero px-8 py-16 text-primary-foreground sm:px-16 sm:py-24">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary-foreground blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider backdrop-blur">
                <Stethoscope className="h-3.5 w-3.5" /> Nexus Ultrassonografia
              </div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
                {courseTypeLabel(course.type)}
              </div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{course.name}</h1>
              {course.description && (
                <p className="mt-6 text-lg text-primary-foreground/90 sm:text-xl">{course.description}</p>
              )}
            </div>
          </div>

          {/* DESTAQUES */}
          <div className="border-b bg-card px-8 py-8 sm:px-16">
            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
              <Stat icon={Clock} label="Carga horária" value={course.workload_hours ? `${course.workload_hours}h` : "—"} />
              <Stat
                icon={Calendar}
                label="Próxima turma"
                value={nextClass?.start_date ? formatDate(nextClass.start_date) : "Em breve"}
              />
              <Stat
                icon={GraduationCap}
                label="Investimento"
                value={course.price != null ? formatBRL(course.price) : "Sob consulta"}
                sub={
                  course.installments && course.installments > 1 && course.price
                    ? `ou ${course.installments}x de ${formatBRL(course.price / course.installments)}`
                    : undefined
                }
              />
            </div>
          </div>

          {/* DESTAQUES BULLETS */}
          {highlights.length > 0 && (
            <div className="bg-background px-8 py-12 sm:px-16">
              <div className="mx-auto max-w-3xl">
                <h2 className="mb-6 text-2xl font-bold">Por que escolher</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                        ✓
                      </div>
                      <span className="text-sm">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* MÓDULOS */}
          {sortedModules.length > 0 && (
            <div className="bg-secondary/40 px-8 py-12 sm:px-16">
              <div className="mx-auto max-w-3xl">
                <h2 className="mb-6 text-2xl font-bold">Conteúdo programático</h2>
                <div className="space-y-3">
                  {sortedModules.map((m, i) => (
                    <div key={m.id} className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold">{m.title}</h4>
                          {m.workload_hours && (
                            <span className="shrink-0 rounded-full bg-secondary px-3 py-0.5 text-xs font-medium">
                              {m.workload_hours}h
                            </span>
                          )}
                        </div>
                        {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-primary px-8 py-12 text-center text-primary-foreground sm:px-16 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl font-bold">Garanta sua vaga</h2>
              <p className="mt-3 text-primary-foreground/90">
                {nextClass?.start_date
                  ? `Próxima turma em ${formatDate(nextClass.start_date)}. Vagas limitadas.`
                  : "Entre em contato para reservar sua vaga."}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-6 py-3 text-sm font-medium backdrop-blur">
                <Stethoscope className="h-4 w-4" /> Nexus Ultrassonografia
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="text-center">
    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
      <Icon className="h-5 w-5" />
    </div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-lg font-bold">{value}</div>
    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
  </div>
);
