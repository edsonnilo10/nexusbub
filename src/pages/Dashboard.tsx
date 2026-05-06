import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Upload, Clock, Calendar, Tag, MapPin, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseFull, CourseClass, CourseUnit, formatBRL, formatDateShort, courseTypeLabel, unitLabel } from "@/lib/courseHelpers";
import { loadAllCourseClasses } from "@/lib/classGroupsResolver";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalAssistantButton } from "@/components/GlobalAssistantButton";
import { usePersistentSelection } from "@/hooks/usePersistentSelection";
import nexusLogo from "@/assets/nexus-logo.jpg";

type CourseWithClass = CourseFull & { next_class?: CourseClass | null };

const Dashboard = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = usePersistentSelection<"all" | "pos_graduacao" | "modular">("dash_type", "all");
  const [unitFilter, setUnitFilter] = usePersistentSelection<"all" | CourseUnit>("dash_unit", "all");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const { data: courseData, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar cursos", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const classData = await loadAllCourseClasses();

    const merged: CourseWithClass[] = (courseData || []).map((c) => {
      const cls = classData.filter((cl) => cl.course_id === c.id);
      const next = cls.find((x) => x.status === "atual") || cls.find((x) => x.status === "proxima") || cls[0] || null;
      return { ...(c as CourseFull), next_class: next as CourseClass | null };
    });

    setCourses(merged);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (unitFilter !== "all" && c.unit !== unitFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [courses, search, typeFilter, unitFilter]);

  const counts = useMemo(() => ({
    all: courses.length,
    sao_paulo: courses.filter((c) => c.unit === "sao_paulo").length,
    brasilia: courses.filter((c) => c.unit === "brasilia").length,
  }), [courses]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />

      <main className="container py-4 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cursos</h1>
            <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">
              {courses.length} {courses.length === 1 ? "curso cadastrado" : "cursos cadastrados"}
            </p>
          </div>
          {/* Mobile: calendário em destaque + 2 ações compactas. Desktop: tudo lado a lado */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="default"
              onClick={() => navigate("/calendar")}
              className="bg-gradient-primary shadow-elegant"
            >
              <CalendarDays className="h-4 w-4" /> Calendário de cursos
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
              <Button variant="outline" onClick={() => navigate("/import")} className="w-full sm:w-auto">
                <Upload className="h-4 w-4" />
                <span className="sm:hidden">Importar</span>
                <span className="hidden sm:inline">Importar arquivos</span>
              </Button>
              <Button onClick={() => navigate("/courses/new")} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">Novo</span>
                <span className="hidden sm:inline">Novo curso</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Unit tabs */}
        <Tabs value={unitFilter} onValueChange={(v) => setUnitFilter(v as any)} className="mb-3 sm:mb-5">
          <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
            <TabsTrigger value="all" className="gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
              Todos <Badge variant="secondary" className="text-[10px]">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sao_paulo" className="gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline sm:inline">São Paulo</span>
              <span className="xs:hidden sm:hidden">SP</span>
              <Badge variant="secondary" className="text-[10px]">{counts.sao_paulo}</Badge>
            </TabsTrigger>
            <TabsTrigger value="brasilia" className="gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline sm:inline">Brasília</span>
              <span className="xs:hidden sm:hidden">BSB</span>
              <Badge variant="secondary" className="text-[10px]">{counts.brasilia}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm">Todos</TabsTrigger>
              <TabsTrigger value="pos_graduacao" className="text-xs sm:text-sm">Pós</TabsTrigger>
              <TabsTrigger value="modular" className="text-xs sm:text-sm">Modular</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 sm:h-72" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <img src={nexusLogo} alt="Nexus" className="mb-4 h-16 w-16 rounded-xl object-cover opacity-60" />
              <h3 className="text-lg font-semibold">Nenhum curso encontrado</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {courses.length === 0
                  ? "Cadastre seu primeiro curso ou importe seus arquivos (PDF, imagem ou planilha)."
                  : "Tente ajustar os filtros ou a busca."}
              </p>
              {courses.length === 0 && (
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/import")}>
                    <Upload className="h-4 w-4" /> Importar arquivos
                  </Button>
                  <Button onClick={() => navigate("/courses/new")}>
                    <Plus className="h-4 w-4" /> Novo curso
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}>
                <Card className="group h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-elegant">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-primary">
                    {course.cover_url ? (
                      <img
                        src={course.cover_url}
                        alt={course.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center text-primary-foreground sm:gap-2 sm:px-4">
                        <img
                          src={nexusLogo}
                          alt="Nexus"
                          className="h-10 w-10 rounded-lg object-cover shadow-card ring-2 ring-primary-foreground/30 transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                        />
                        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90 sm:text-[11px]">
                          {courseTypeLabel(course.type)}
                        </div>
                        <div className="line-clamp-2 text-[11px] font-medium leading-tight opacity-95 sm:text-xs">
                          {course.name}
                        </div>
                      </div>
                    )}
                    <Badge
                      className="absolute left-2 top-2 text-[10px] sm:left-3 sm:top-3 sm:text-xs"
                      variant={course.type === "pos_graduacao" ? "default" : "secondary"}
                    >
                      {courseTypeLabel(course.type)}
                    </Badge>
                    <Badge
                      className="absolute right-2 top-2 gap-1 bg-background/95 text-[10px] text-foreground backdrop-blur sm:right-3 sm:top-3 sm:text-xs"
                      variant="outline"
                    >
                      <MapPin className="h-3 w-3" /> {unitLabel(course.unit)}
                    </Badge>
                  </div>
                  <CardContent className="p-3 sm:p-5">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-lg">{course.name}</h3>
                    <div className="mt-2 space-y-1.5 text-xs text-muted-foreground sm:mt-4 sm:space-y-2 sm:text-sm">
                      {course.workload_hours && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-accent sm:h-4 sm:w-4" />
                          <span>{course.workload_hours}h de carga horária</span>
                        </div>
                      )}
                      {course.next_class?.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-accent sm:h-4 sm:w-4" />
                          <span>Próxima: {formatDateShort(course.next_class.start_date)}</span>
                        </div>
                      )}
                      {course.price != null && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 shrink-0 text-accent sm:h-4 sm:w-4" />
                          <span className="font-semibold text-foreground">{formatBRL(course.price)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <GlobalAssistantButton />
    </div>
  );
};

export default Dashboard;
