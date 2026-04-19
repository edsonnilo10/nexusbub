import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, MapPin, DollarSign, CalendarDays, GraduationCap,
  TrendingUp, UserCheck, Loader2,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSyncedData } from "@/hooks/useSyncedData";

const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const unitLabel = (u: "sao_paulo" | "brasilia") => (u === "sao_paulo" ? "São Paulo" : "Brasília");

const GlobalDashboard = () => {
  const navigate = useNavigate();
  const { classEnrollments, paidStudents, calendarEvents, loading } = useSyncedData();

  useEffect(() => {
    document.title = "Dashboard | Nexus Ultrassonografia";
  }, []);

  const stats = useMemo(() => {
    const sp = classEnrollments.filter((c) => c.unit === "sao_paulo");
    const df = classEnrollments.filter((c) => c.unit === "brasilia");
    const sumSp = sp.reduce((a, c) => a + (c.student_count || 0), 0);
    const sumDf = df.reduce((a, c) => a + (c.student_count || 0), 0);
    const revenue = paidStudents.reduce((a, s) => a + (s.amount || 0), 0);
    const avgTicket = paidStudents.length ? revenue / paidStudents.length : 0;
    return {
      sumSp, sumDf, total: sumSp + sumDf,
      classesSp: sp.length, classesDf: df.length,
      revenue, paidCount: paidStudents.length, avgTicket,
    };
  }, [classEnrollments, paidStudents]);

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return calendarEvents
      .filter((e) => !e.start_date || e.start_date >= today)
      .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
      .slice(0, 10);
  }, [calendarEvents]);

  const topCourses = useMemo(() => {
    const map = new Map<string, number>();
    classEnrollments.forEach((c) => {
      const key = c.course_name || "Sem curso";
      map.set(key, (map.get(key) || 0) + (c.student_count || 0));
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [classEnrollments]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container py-4 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-3 sm:mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Visão consolidada de todos os cursos, unidades e turmas.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={<Users className="h-4 w-4" />} label="Total matriculados" value={stats.total.toLocaleString("pt-BR")} sub={`${stats.classesSp + stats.classesDf} turma(s)`} />
              <Kpi icon={<UserCheck className="h-4 w-4" />} label="Pagos confirmados" value={stats.paidCount.toLocaleString("pt-BR")} sub={`Ticket médio ${fmtMoney(stats.avgTicket)}`} />
              <Kpi icon={<DollarSign className="h-4 w-4" />} label="Receita confirmada" value={fmtMoney(stats.revenue)} accent />
              <Kpi icon={<CalendarDays className="h-4 w-4" />} label="Próximos eventos" value={upcomingEvents.length.toLocaleString("pt-BR")} sub="agendados" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <UnitCard title="São Paulo" students={stats.sumSp} classes={stats.classesSp} />
              <UnitCard title="Brasília" students={stats.sumDf} classes={stats.classesDf} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Top cursos por matrículas
                  </CardTitle>
                  <CardDescription>Soma de alunos por curso</CardDescription>
                </CardHeader>
                <CardContent>
                  {topCourses.length === 0 ? (
                    <Empty text="Nenhuma matrícula sincronizada ainda." />
                  ) : (
                    <ul className="space-y-3">
                      {topCourses.map((c) => {
                        const pct = stats.total ? (c.count / stats.total) * 100 : 0;
                        return (
                          <li key={c.name}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                              <span className="truncate font-medium">{c.name}</span>
                              <Badge variant="secondary" className="shrink-0">{c.count}</Badge>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Próximos eventos
                  </CardTitle>
                  <CardDescription>{upcomingEvents.length} agendado(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingEvents.length === 0 ? (
                    <Empty text="Nenhum evento futuro." />
                  ) : (
                    <ScrollArea className="max-h-[360px]">
                      <ul className="divide-y">
                        {upcomingEvents.map((e) => (
                          <li key={e.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px]">📍 {unitLabel(e.unit)}</Badge>
                                <span className="truncate text-sm font-medium">{e.course_name}</span>
                              </div>
                              {e.event_label && <div className="text-xs text-muted-foreground">{e.event_label}</div>}
                            </div>
                            <div className="text-xs text-muted-foreground sm:text-right">{fmtDate(e.start_date)}</div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
        <div className={`mt-1 text-xl font-bold sm:text-2xl ${accent ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function UnitCard({ title, students, classes }: { title: string; students: number; classes: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{title}</span>
          <Badge variant="secondary">{classes} turma(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <span className="text-3xl font-bold">{students.toLocaleString("pt-BR")}</span>
          <span className="text-sm text-muted-foreground">aluno(s) matriculado(s)</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

export default GlobalDashboard;
