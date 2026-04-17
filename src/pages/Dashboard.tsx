import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Upload, Clock, Calendar, Tag, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseFull, CourseClass, formatBRL, formatDateShort, courseTypeLabel } from "@/lib/courseHelpers";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type CourseWithClass = CourseFull & { next_class?: CourseClass | null };

const Dashboard = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pos_graduacao" | "modular">("all");

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

    const { data: classData } = await supabase
      .from("course_classes")
      .select("*")
      .order("start_date", { ascending: true });

    const merged: CourseWithClass[] = (courseData || []).map((c) => {
      const cls = (classData || []).filter((cl) => cl.course_id === c.id);
      const next = cls.find((x) => x.status === "atual") || cls.find((x) => x.status === "proxima") || cls[0] || null;
      return { ...c, next_class: next as CourseClass | null };
    });

    setCourses(merged);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (filter !== "all" && c.type !== filter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [courses, search, filter]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />

      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cursos</h1>
            <p className="mt-1 text-muted-foreground">
              {courses.length} {courses.length === 1 ? "curso cadastrado" : "cursos cadastrados"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/import")}>
              <Upload className="h-4 w-4" /> Importar planilha
            </Button>
            <Button onClick={() => navigate("/courses/new")}>
              <Plus className="h-4 w-4" /> Novo curso
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pos_graduacao">Pós-graduação</TabsTrigger>
              <TabsTrigger value="modular">Modular</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Stethoscope className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">Nenhum curso encontrado</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {courses.length === 0
                  ? "Cadastre seu primeiro curso ou importe sua planilha existente."
                  : "Tente ajustar os filtros ou a busca."}
              </p>
              {courses.length === 0 && (
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/import")}>
                    <Upload className="h-4 w-4" /> Importar planilha
                  </Button>
                  <Button onClick={() => navigate("/courses/new")}>
                    <Plus className="h-4 w-4" /> Novo curso
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="flex h-full w-full items-center justify-center text-primary-foreground/60">
                        <Stethoscope className="h-12 w-12" />
                      </div>
                    )}
                    <Badge
                      className="absolute left-3 top-3"
                      variant={course.type === "pos_graduacao" ? "default" : "secondary"}
                    >
                      {courseTypeLabel(course.type)}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-tight">{course.name}</h3>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {course.workload_hours && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-accent" />
                          <span>{course.workload_hours}h de carga horária</span>
                        </div>
                      )}
                      {course.next_class?.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-accent" />
                          <span>Próxima: {formatDateShort(course.next_class.start_date)}</span>
                        </div>
                      )}
                      {course.price != null && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-accent" />
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
    </div>
  );
};

export default Dashboard;
