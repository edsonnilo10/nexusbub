import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Clock, MapPin, Sparkles, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  classStatusLabel,
  classStatusVariant,
  formatClassDateRange,
  unitShort,
  type CourseUnit,
} from "@/lib/courseHelpers";
import type { ClassGroupRow, GroupCourseRow } from "@/pages/ClassGroups";

interface Props {
  groups: ClassGroupRow[];
  coursesByGroup: Map<string, GroupCourseRow[]>;
  onSelect: (group: ClassGroupRow) => void;
  unitFilter: "all" | CourseUnit;
}

const startOfTodayUTC = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDate = (s: string) => new Date(s + "T00:00:00");

const countdownLabel = (start: Date, today: Date): { text: string; tone: "now" | "soon" | "future" } => {
  const ms = start.getTime() - today.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Em andamento", tone: "now" };
  if (days === 0) return { text: "Começa hoje", tone: "now" };
  if (days === 1) return { text: "Amanhã", tone: "soon" };
  if (days <= 7) return { text: `Em ${days} dias`, tone: "soon" };
  if (days <= 30) return { text: `Em ${days} dias`, tone: "future" };
  if (days <= 60) return { text: `Em ~${Math.round(days / 7)} semanas`, tone: "future" };
  const months = Math.round(days / 30);
  return { text: `Em ~${months} ${months === 1 ? "mês" : "meses"}`, tone: "future" };
};

export const UpcomingClassesPanel = ({ groups, coursesByGroup, onSelect, unitFilter }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [today, setToday] = useState(startOfTodayUTC());

  // Refresh "today" hourly so countdown stays accurate
  useEffect(() => {
    const interval = setInterval(() => setToday(startOfTodayUTC()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = useMemo(() => {
    return groups
      .filter((g) => {
        if (unitFilter !== "all" && g.unit !== unitFilter) return false;
        if (g.status === "encerrada") return false;
        const end = parseDate(g.end_date);
        return end.getTime() >= today.getTime();
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [groups, unitFilter, today]);

  if (upcoming.length === 0) return null;

  const visible = expanded ? upcoming : upcoming.slice(0, 6);

  return (
    <Card className="mb-4 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Próximas turmas</h2>
              <p className="text-xs text-muted-foreground">
                {upcoming.length} {upcoming.length === 1 ? "janela futura" : "janelas futuras"}
                {unitFilter !== "all" && ` · ${unitShort(unitFilter)}`}
              </p>
            </div>
          </div>
          {upcoming.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-8 text-xs"
            >
              {expanded ? (
                <>
                  Recolher <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ver todas ({upcoming.length}) <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>

        <ScrollArea className={expanded ? "max-h-[420px] pr-2" : ""}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((g) => {
              const cs = coursesByGroup.get(g.id) ?? [];
              const isCombo = cs.length >= 2;
              const cd = countdownLabel(parseDate(g.start_date), today);
              const toneClass =
                cd.tone === "now"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : cd.tone === "soon"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    : "bg-muted text-muted-foreground border-border";
              const primaryCourse = cs[0]?.course_name ?? "Sem curso vinculado";

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelect(g)}
                  className="group relative flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className={`gap-1 text-[10px] ${toneClass}`}>
                      <Clock className="h-2.5 w-2.5" />
                      {cd.text}
                    </Badge>
                    <Badge variant={classStatusVariant(g.status)} className="text-[10px]">
                      {classStatusLabel(g.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                    {isCombo && <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    <span className="truncate">
                      {formatClassDateRange(g.start_date, g.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                      {unitShort(g.unit)}
                    </span>
                    {g.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{g.location}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    {isCombo ? (
                      <>
                        <Users2 className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate font-medium text-primary">
                          Combo · {cs.length} cursos
                        </span>
                      </>
                    ) : (
                      <span className="truncate text-muted-foreground" title={primaryCourse}>
                        {primaryCourse}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
