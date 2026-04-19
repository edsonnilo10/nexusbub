import { useMemo } from "react";
import { Loader2, Users, DollarSign, CalendarDays, MapPin, GraduationCap, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSyncedData } from "@/hooks/useSyncedData";
import { CourseFull } from "@/lib/courseHelpers";

interface Props {
  course: CourseFull;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtMoney = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const unitLabel = (u: "sao_paulo" | "brasilia") => (u === "sao_paulo" ? "São Paulo" : "Brasília");

export const CourseOperationsTab = ({ course }: Props) => {
  const { classEnrollments, paidStudents, calendarEvents, loading } = useSyncedData(course.id);

  const grouped = useMemo(() => {
    const sp = classEnrollments.filter((c) => c.unit === "sao_paulo");
    const df = classEnrollments.filter((c) => c.unit === "brasilia");
    const sumSp = sp.reduce((acc, c) => acc + (c.student_count || 0), 0);
    const sumDf = df.reduce((acc, c) => acc + (c.student_count || 0), 0);
    return { sp, df, sumSp, sumDf, total: sumSp + sumDf };
  }, [classEnrollments]);

  const totalRevenue = useMemo(
    () => paidStudents.reduce((acc, s) => acc + (s.amount || 0), 0),
    [paidStudents],
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return calendarEvents
      .filter((e) => !e.start_date || e.start_date >= today)
      .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  }, [calendarEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Total matriculados" value={grouped.total.toString()} />
        <SummaryCard icon={<MapPin className="h-4 w-4" />} label="SP" value={grouped.sumSp.toString()} accent="primary" />
        <SummaryCard icon={<MapPin className="h-4 w-4" />} label="DF" value={grouped.sumDf.toString()} accent="primary" />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Pagos confirmados"
          value={paidStudents.length.toString()}
          sub={fmtMoney(totalRevenue)}
        />
      </div>

      {/* Matrículas por turma */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ClassEnrollmentsCard
          title="São Paulo"
          icon={<GraduationCap className="h-4 w-4 text-primary" />}
          items={grouped.sp}
          totalStudents={grouped.sumSp}
        />
        <ClassEnrollmentsCard
          title="Brasília"
          icon={<GraduationCap className="h-4 w-4 text-primary" />}
          items={grouped.df}
          totalStudents={grouped.sumDf}
        />
      </div>

      {/* Próximos eventos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Próximos eventos
          </CardTitle>
          <CardDescription>{upcomingEvents.length} evento(s) agendados</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <EmptyState text="Nenhum evento futuro encontrado para este curso." />
          ) : (
            <ul className="divide-y">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        📍 {unitLabel(e.unit)}
                      </Badge>
                      {e.event_label && <span className="font-medium">{e.event_label}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {e.location && <span>{e.location}</span>}
                      {e.coordinator && <span>Coord.: {e.coordinator}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <div>{fmtDate(e.start_date)}</div>
                    {e.end_date && e.end_date !== e.start_date && <div>até {fmtDate(e.end_date)}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Alunos pagos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" />
            Alunos com pagamento confirmado
          </CardTitle>
          <CardDescription>
            {paidStudents.length} aluno(s) · {fmtMoney(totalRevenue)} arrecadado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paidStudents.length === 0 ? (
            <EmptyState text="Nenhum aluno pago encontrado para este curso." />
          ) : (
            <ScrollArea className="max-h-[420px]">
              <ul className="divide-y">
                {paidStudents.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium leading-tight">{s.student_name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {s.class_label && <span>Turma: {s.class_label}</span>}
                        {s.contract_status && <span>Contrato: {s.contract_status}</span>}
                        {s.payment_date && <span>Pago em {fmtDate(s.payment_date)}</span>}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground sm:text-right">{fmtMoney(s.amount)}</div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "primary";
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`mt-1 text-2xl font-bold ${accent === "primary" ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ClassEnrollmentsCard({
  title,
  icon,
  items,
  totalStudents,
}: {
  title: string;
  icon: React.ReactNode;
  items: ReturnType<typeof useSyncedData>["classEnrollments"];
  totalStudents: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <Badge variant="secondary">{totalStudents} aluno(s)</Badge>
        </CardTitle>
        <CardDescription>{items.length} turma(s) ativas</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState text={`Nenhuma turma encontrada em ${title}.`} />
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-tight">{c.class_label || "Turma sem nome"}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.class_start_date ? fmtDate(c.class_start_date) : "Data a definir"}
                    {c.class_end_date && ` → ${fmtDate(c.class_end_date)}`}
                  </div>
                </div>
                <Badge className="shrink-0">{c.student_count} aluno(s)</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
