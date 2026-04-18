import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, MapPin, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CourseClass, CourseFull, CourseUnit, ClassStatus,
  classStatusLabel, formatClassDateRange, courseTypeLabel, unitLabel,
} from "@/lib/courseHelpers";

interface CalendarEvent {
  classId: string;
  courseId: string;
  courseName: string;
  type: CourseFull["type"];
  unit: CourseUnit;
  startDate: Date;
  endDate: Date | null;
  startStr: string;
  endStr: string | null;
  status: ClassStatus;
  location: string | null;
}

const STATUS_DOT: Record<ClassStatus, string> = {
  atual: "bg-primary",
  proxima: "bg-accent",
  aguardando_confirmacao: "bg-amber-500",
  encerrada: "bg-muted-foreground/40",
};

const STATUS_BORDER: Record<ClassStatus, string> = {
  atual: "border-l-primary",
  proxima: "border-l-accent",
  aguardando_confirmacao: "border-l-amber-500",
  encerrada: "border-l-muted-foreground/40",
};

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ymKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const CourseCalendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [unitFilter, setUnitFilter] = useState<"all" | CourseUnit>("all");
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  useEffect(() => {
    document.title = "Calendário de Cursos | Nexus Ultrassonografia";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: courses }, { data: classes }] = await Promise.all([
      supabase.from("courses").select("id, name, type, unit"),
      supabase.from("course_classes").select("*").not("start_date", "is", null).order("start_date"),
    ]);
    const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));
    const evts: CalendarEvent[] = [];
    for (const cl of (classes || []) as CourseClass[]) {
      if (!cl.start_date) continue;
      const c = courseMap.get(cl.course_id);
      if (!c) continue;
      const start = new Date(cl.start_date + "T00:00:00");
      const end = cl.end_date ? new Date(cl.end_date + "T00:00:00") : null;
      if (isNaN(start.getTime())) continue;
      evts.push({
        classId: cl.id,
        courseId: cl.course_id,
        courseName: c.name,
        type: c.type,
        unit: c.unit,
        startDate: start,
        endDate: end,
        startStr: cl.start_date,
        endStr: cl.end_date,
        status: cl.status,
        location: cl.location,
      });
    }
    setEvents(evts);
    setLoading(false);
  };

  const filtered = useMemo(
    () => (unitFilter === "all" ? events : events.filter((e) => e.unit === unitFilter)),
    [events, unitFilter],
  );

  const counts = useMemo(() => ({
    all: events.length,
    sao_paulo: events.filter((e) => e.unit === "sao_paulo").length,
    brasilia: events.filter((e) => e.unit === "brasilia").length,
  }), [events]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container px-3 py-4 sm:px-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-4 space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-3xl">
            <CalendarDays className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
            Calendário de cursos
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {events.length} turma(s) cadastrada(s) entre as duas unidades.
          </p>
        </div>

        {/* Toolbar: view + unit filter */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={unitFilter} onValueChange={(v) => setUnitFilter(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="all" className="gap-1 px-2 text-xs sm:text-sm">
                Todos <Badge variant="secondary" className="text-[10px]">{counts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="sao_paulo" className="gap-1 px-2 text-xs sm:text-sm">
                <MapPin className="h-3 w-3" />
                <span className="hidden xs:inline sm:inline">SP</span>
                <Badge variant="secondary" className="text-[10px]">{counts.sao_paulo}</Badge>
              </TabsTrigger>
              <TabsTrigger value="brasilia" className="gap-1 px-2 text-xs sm:text-sm">
                <MapPin className="h-3 w-3" />
                <span className="hidden xs:inline sm:inline">BSB</span>
                <Badge variant="secondary" className="text-[10px]">{counts.brasilia}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <TabsTrigger value="grid" className="gap-1.5 text-xs sm:text-sm">
                <LayoutGrid className="h-3.5 w-3.5" />Mês
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm">
                <List className="h-3.5 w-3.5" />Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Legenda de status */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground sm:text-xs">
          {(["atual", "proxima", "aguardando_confirmacao", "encerrada"] as ClassStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {classStatusLabel(s)}
            </div>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : view === "grid" ? (
          <MonthGrid cursor={cursor} setCursor={setCursor} events={filtered} />
        ) : (
          <Timeline events={filtered} />
        )}
      </main>
    </div>
  );
};

/* ===================== MONTH GRID ===================== */
const MonthGrid = ({
  cursor, setCursor, events,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  events: CalendarEvent[];
}) => {
  const navigate = useNavigate();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  // Eventos por dia
  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
      const s = e.startDate;
      const en = e.endDate || e.startDate;
      // varre cada dia entre s e en que cai dentro deste mês
      const cur = new Date(s);
      while (cur <= en) {
        if (cur.getFullYear() === year && cur.getMonth() === month) {
          const day = cur.getDate();
          const arr = map.get(day) || [];
          if (!arr.find((x) => x.classId === e.classId)) arr.push(e);
          map.set(day, arr);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [events, year, month]);

  const today = new Date();
  const isToday = (day: number) => sameDay(new Date(year, month, day), today);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{MONTHS_PT[month]} {year}</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const n = new Date();
              setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
            }}
          >
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS_PT.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <TooltipProvider delayDuration={150}>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - startOffset + 1;
                const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const dayEvents = inMonth ? (byDay.get(dayNum) || []) : [];
                return (
                  <div
                    key={i}
                    className={`min-h-[78px] rounded-md border p-1 text-left text-xs sm:min-h-[96px] ${
                      inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground/40"
                    } ${isToday(dayNum) ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={isToday(dayNum) ? "font-bold text-primary" : ""}>
                        {inMonth ? dayNum : ""}
                      </span>
                      {dayEvents.length > 2 && (
                        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                          +{dayEvents.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((e) => (
                        <Tooltip key={e.classId}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => navigate(`/courses/${e.courseId}`)}
                              className={`flex w-full items-center gap-1 rounded border-l-2 ${STATUS_BORDER[e.status]} bg-muted/40 px-1 py-0.5 text-left text-[10px] leading-tight hover:bg-muted`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[e.status]}`} />
                              <span className="truncate">{e.courseName}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{e.courseName}</p>
                              <p className="text-xs">{formatClassDateRange(e.startStr, e.endStr)}</p>
                              <p className="text-xs">{unitLabel(e.unit)} · {classStatusLabel(e.status)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

/* ===================== TIMELINE ===================== */
const Timeline = ({ events }: { events: CalendarEvent[] }) => {
  const navigate = useNavigate();
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [events],
  );

  // Agrupa por mês/ano
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: CalendarEvent[] }>();
    for (const e of sorted) {
      const k = ymKey(e.startDate);
      const label = `${MONTHS_PT[e.startDate.getMonth()]} ${e.startDate.getFullYear()}`;
      if (!map.has(k)) map.set(k, { label, items: [] });
      map.get(k)!.items.push(e);
    }
    return Array.from(map.values());
  }, [sorted]);

  if (groups.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma turma cadastrada para esse filtro.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
          </h3>
          <div className="space-y-2">
            {g.items.map((e) => (
              <Card
                key={e.classId}
                className={`cursor-pointer border-l-4 transition-shadow hover:shadow-elegant ${STATUS_BORDER[e.status]}`}
                onClick={() => navigate(`/courses/${e.courseId}`)}
              >
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[e.status]}`} />
                      <h4 className="font-semibold">{e.courseName}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatClassDateRange(e.startStr, e.endStr)}
                      {e.location && ` · ${e.location}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />{unitLabel(e.unit)}
                    </Badge>
                    <Badge variant={e.type === "pos_graduacao" ? "default" : "secondary"}>
                      {courseTypeLabel(e.type)}
                    </Badge>
                    <Badge variant="outline">{classStatusLabel(e.status)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CourseCalendar;
