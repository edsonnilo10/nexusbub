import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Loader2, Plus, Search, Sparkles, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  classStatusLabel,
  classStatusVariant,
  formatClassDateRange,
  unitLabel,
  type ClassStatus,
  type CourseUnit,
} from "@/lib/courseHelpers";
import { ClassGroupDialog } from "@/components/classGroups/ClassGroupDialog";
import { ClassGroupDetailsDialog } from "@/components/classGroups/ClassGroupDetailsDialog";
import { UpcomingClassesPanel } from "@/components/classGroups/UpcomingClassesPanel";
import { usePersistentSelection } from "@/hooks/usePersistentSelection";

export interface ClassGroupRow {
  id: string;
  unit: CourseUnit;
  start_date: string;
  end_date: string;
  status: ClassStatus;
  location: string | null;
  notes: string | null;
}

export interface GroupCourseRow {
  id: string;
  group_id: string;
  course_id: string;
  start_date: string | null;
  end_date: string | null;
  display_mode: "individual" | "combo_only" | "both";
  course_name: string;
}

export interface CourseOption {
  id: string;
  name: string;
  unit: CourseUnit;
}

const ClassGroups = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ClassGroupRow[]>([]);
  const [groupCourses, setGroupCourses] = useState<GroupCourseRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [unitFilter, setUnitFilter] = useState<"all" | CourseUnit>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ClassStatus>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroupRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsGroup, setDetailsGroup] = useState<ClassGroupRow | null>(null);
  const [comboFilter, setComboFilter] = useState<"all" | "combo" | "single">("all");

  useEffect(() => {
    document.title = "Turmas | Nexus Ultrassonografia";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [groupsRes, gcRes, coursesRes] = await Promise.all([
      supabase
        .from("class_groups")
        .select("id,unit,start_date,end_date,status,location,notes")
        .order("start_date", { ascending: true }),
      supabase
        .from("class_group_courses")
        .select("id,group_id,course_id,start_date,end_date,display_mode,courses(name)")
        .order("created_at", { ascending: true }),
      supabase.from("courses").select("id,name,unit").order("name"),
    ]);

    if (groupsRes.error) {
      toast({ title: "Erro ao carregar turmas", description: groupsRes.error.message, variant: "destructive" });
    } else {
      setGroups((groupsRes.data as ClassGroupRow[]) ?? []);
    }
    if (gcRes.data) {
      setGroupCourses(
        gcRes.data.map((r: any) => ({
          id: r.id,
          group_id: r.group_id,
          course_id: r.course_id,
          start_date: r.start_date,
          end_date: r.end_date,
          display_mode: r.display_mode,
          course_name: r.courses?.name ?? "—",
        })),
      );
    }
    if (coursesRes.data) setCourses(coursesRes.data as CourseOption[]);
    setLoading(false);
  };

  const coursesByGroup = useMemo(() => {
    const map = new Map<string, GroupCourseRow[]>();
    for (const gc of groupCourses) {
      const list = map.get(gc.group_id) ?? [];
      list.push(gc);
      map.set(gc.group_id, list);
    }
    return map;
  }, [groupCourses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (unitFilter !== "all" && g.unit !== unitFilter) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      const cs = coursesByGroup.get(g.id) ?? [];
      if (comboFilter === "combo" && cs.length < 2) return false;
      if (comboFilter === "single" && cs.length >= 2) return false;
      if (q) {
        const hay = [
          formatClassDateRange(g.start_date, g.end_date),
          g.location ?? "",
          g.notes ?? "",
          ...cs.map((c) => c.course_name),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [groups, coursesByGroup, unitFilter, statusFilter, search, comboFilter]);

  const grouped = useMemo(() => {
    const byUnit = new Map<CourseUnit, ClassGroupRow[]>();
    for (const g of filtered) {
      const arr = byUnit.get(g.unit) ?? [];
      arr.push(g);
      byUnit.set(g.unit, arr);
    }
    return byUnit;
  }, [filtered]);

  const openNew = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const openDetails = (g: ClassGroupRow) => {
    setDetailsGroup(g);
    setDetailsOpen(true);
  };

  const openEditFromDetails = () => {
    if (!detailsGroup) return;
    setEditingGroup(detailsGroup);
    setDetailsOpen(false);
    setDialogOpen(true);
  };

  const comboCount = useMemo(
    () =>
      groups.reduce((acc, g) => {
        const cs = coursesByGroup.get(g.id) ?? [];
        return cs.length >= 2 ? acc + 1 : acc;
      }, 0),
    [groups, coursesByGroup],
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container py-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Turmas</h1>
              <p className="text-sm text-muted-foreground">
                Janelas de aula compartilhadas entre cursos. Cadastre uma vez, vincule vários cursos.
              </p>
            </div>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova janela
          </Button>
        </div>

        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por curso, local ou nota…"
                className="pl-9"
              />
            </div>
            <Tabs value={unitFilter} onValueChange={(v) => setUnitFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="sao_paulo">SP</TabsTrigger>
                <TabsTrigger value="brasilia">BSB</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="atual">Em andamento</SelectItem>
                <SelectItem value="proxima">Confirmada</SelectItem>
                <SelectItem value="aguardando_confirmacao">Aguardando</SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
            <Tabs value={comboFilter} onValueChange={(v) => setComboFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Tipo</TabsTrigger>
                <TabsTrigger value="combo" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Combos
                  {comboCount > 0 && (
                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                      {comboCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="single">Únicas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {!loading && (
          <UpcomingClassesPanel
            groups={groups}
            coursesByGroup={coursesByGroup}
            onSelect={openDetails}
            unitFilter={unitFilter}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma janela encontrada. Clique em <span className="font-medium">Nova janela</span> para criar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {(["sao_paulo", "brasilia"] as CourseUnit[]).map((unit) => {
              const list = grouped.get(unit);
              if (!list || list.length === 0) return null;
              return (
                <div key={unit}>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {unitLabel(unit)}
                    </h2>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((g) => {
                      const cs = coursesByGroup.get(g.id) ?? [];
                      const isCombo = cs.length >= 2;
                      return (
                        <Card
                          key={g.id}
                          className={`group relative cursor-pointer overflow-hidden transition hover:shadow-card ${
                            isCombo
                              ? "border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card hover:border-primary/60"
                              : ""
                          }`}
                          onClick={() => openDetails(g)}
                        >
                          {isCombo && (
                            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/40" />
                          )}
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="flex items-center gap-1.5 text-base leading-tight">
                                {isCombo && (
                                  <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-label="Janela compartilhada" />
                                )}
                                <span>{formatClassDateRange(g.start_date, g.end_date)}</span>
                              </CardTitle>
                              <Badge variant={classStatusVariant(g.status)} className="shrink-0">
                                {classStatusLabel(g.status)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isCombo && (
                                <Badge
                                  variant="outline"
                                  className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                                >
                                  Combo · {cs.length} cursos
                                </Badge>
                              )}
                              {g.location && (
                                <p className="text-xs text-muted-foreground">{g.location}</p>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users2 className="h-3.5 w-3.5" />
                              {cs.length} {cs.length === 1 ? "curso vinculado" : "cursos vinculados"}
                            </div>
                            {cs.length === 0 ? (
                              <p className="text-xs italic text-muted-foreground">
                                Nenhum curso vinculado
                              </p>
                            ) : (
                              <ul className="space-y-1">
                                {cs.slice(0, 4).map((c) => (
                                  <li
                                    key={c.id}
                                    className="flex items-center gap-2 text-xs"
                                    title={c.course_name}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                        c.display_mode === "combo_only"
                                          ? "bg-primary"
                                          : c.display_mode === "both"
                                            ? "bg-amber-500"
                                            : "bg-muted-foreground"
                                      }`}
                                    />
                                    <span className="truncate">{c.course_name}</span>
                                  </li>
                                ))}
                                {cs.length > 4 && (
                                  <li className="text-xs font-medium text-primary">
                                    +{cs.length - 4} {cs.length - 4 === 1 ? "curso" : "cursos"} · clique para ver
                                  </li>
                                )}
                              </ul>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ClassGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={editingGroup}
        courses={courses}
        existingCourses={editingGroup ? coursesByGroup.get(editingGroup.id) ?? [] : []}
        onSaved={load}
      />

      <ClassGroupDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        group={detailsGroup}
        groupCourses={detailsGroup ? coursesByGroup.get(detailsGroup.id) ?? [] : []}
        onEdit={openEditFromDetails}
      />
    </div>
  );
};

export default ClassGroups;
