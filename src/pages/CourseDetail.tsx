import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Loader2, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CourseFull, CourseModule, CourseClass, courseTypeLabel, unitLabel } from "@/lib/courseHelpers";
import { CourseInfoTab } from "@/components/course/CourseInfoTab";
import { CourseLandingTab } from "@/components/course/CourseLandingTab";
import { CourseWhatsAppTab } from "@/components/course/CourseWhatsAppTab";
import { CourseClassesTab } from "@/components/course/CourseClassesTab";
import { CourseAssistant } from "@/components/course/CourseAssistant";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseFull | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  const load = async (courseId: string) => {
    setLoading(true);
    const [{ data: c }, { data: m }, { data: cls }] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      supabase.from("course_modules").select("*").eq("course_id", courseId),
      supabase.from("course_classes").select("*").eq("course_id", courseId),
    ]);
    if (!c) {
      toast({ title: "Curso não encontrado", variant: "destructive" });
      navigate("/");
      return;
    }
    document.title = `${c.name} | Nexus Ultrassonografia`;
    setCourse(c as CourseFull);
    setModules((m as CourseModule[]) || []);
    setClasses((cls as CourseClass[]) || []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Curso excluído" });
      navigate("/");
    }
  };

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar para cursos
        </Button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={course.type === "pos_graduacao" ? "default" : "secondary"}>
                {courseTypeLabel(course.type)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                📍 {unitLabel(course.unit)}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${course.id}/edit`)}>
              <Edit className="h-4 w-4" /> Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir este curso?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser desfeita. O curso, módulos e turmas serão removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex sm:grid-cols-none">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="classes">Turmas</TabsTrigger>
            <TabsTrigger value="landing">Apresentação</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-6">
            <CourseInfoTab course={course} modules={modules} classes={classes} />
          </TabsContent>
          <TabsContent value="classes" className="mt-6">
            <CourseClassesTab course={course} classes={classes} onChange={setClasses} />
          </TabsContent>
          <TabsContent value="landing" className="mt-6">
            <CourseLandingTab course={course} modules={modules} classes={classes} />
          </TabsContent>
          <TabsContent value="whatsapp" className="mt-6">
            <CourseWhatsAppTab course={course} modules={modules} classes={classes} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CourseDetail;
