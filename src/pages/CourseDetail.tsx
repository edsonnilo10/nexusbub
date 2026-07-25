import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Edit, Loader2, Trash2, Sparkles, FileText, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CourseFull, CourseModule, CourseClass, courseTypeLabel, unitLabel, isComboCourse } from "@/lib/courseHelpers";
import { CourseInfoTab } from "@/components/course/CourseInfoTab";
import { CourseLandingTab } from "@/components/course/CourseLandingTab";
import { CourseWhatsAppTab } from "@/components/course/CourseWhatsAppTab";
import { CourseClassesTab } from "@/components/course/CourseClassesTab";
import { CourseAssistant } from "@/components/course/CourseAssistant";
import { CourseProposal } from "@/components/course/CourseProposal";

import { CourseOperationsTab } from "@/components/course/CourseOperationsTab";
import { ComboTabs } from "@/components/course/ComboTabs";
import { loadCourseClasses } from "@/lib/classGroupsResolver";
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
  const [comboComponentIds, setComboComponentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "assistant";

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  const load = async (courseId: string) => {
    setLoading(true);
    const [{ data: c }, { data: m }, cls, { data: rules }] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      supabase.from("course_modules").select("*").eq("course_id", courseId),
      loadCourseClasses(courseId),
      supabase.from("course_combo_rules").select("trigger_course_ids").eq("combo_course_id", courseId).eq("active", true),
    ]);
    if (!c) {
      toast({ title: "Curso não encontrado", variant: "destructive" });
      navigate("/");
      return;
    }
    document.title = `${c.name} | Nexus Ultrassonografia`;
    setCourse(c as CourseFull);
    setModules((m as CourseModule[]) || []);
    setClasses(cls);
    const triggerIds = (rules || []).flatMap((r: any) => r.trigger_course_ids || []);
    setComboComponentIds(Array.from(new Set(triggerIds)));
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
      <main className="container py-4 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-3 sm:mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar para cursos
        </Button>

        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={course.type === "pos_graduacao" ? "default" : "secondary"}>
                {courseTypeLabel(course.type)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                📍 {unitLabel(course.unit)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{course.name}</h1>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => navigate(`/courses/${course.id}/edit`)} className="flex-1 sm:flex-none">
              <Edit className="h-4 w-4" /> Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

        <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 rounded-xl p-1 sm:min-w-0">
              <TabsTrigger value="assistant" className="shrink-0 gap-1.5 text-xs sm:text-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="sm:hidden">IA</span>
                <span className="hidden sm:inline">Assistente IA</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="shrink-0 gap-1.5 text-xs sm:text-sm">
                <Activity className="h-3.5 w-3.5" /> Operação
              </TabsTrigger>
              <TabsTrigger value="proposal" className="shrink-0 gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" /> Proposta
              </TabsTrigger>
              <TabsTrigger value="info" className="shrink-0 text-xs sm:text-sm">Info</TabsTrigger>
              <TabsTrigger value="classes" className="shrink-0 text-xs sm:text-sm">Turmas</TabsTrigger>
              <TabsTrigger value="landing" className="shrink-0 text-xs sm:text-sm">Apresentação</TabsTrigger>
              <TabsTrigger value="whatsapp" className="shrink-0 text-xs sm:text-sm">WhatsApp</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="assistant" className="mt-4 sm:mt-6">
            <CourseAssistant course={course} />
          </TabsContent>
          <TabsContent value="operations" className="mt-4 sm:mt-6">
            <CourseOperationsTab course={course} />
          </TabsContent>
          <TabsContent value="proposal" className="mt-4 sm:mt-6">
            <CourseProposal course={course} modules={modules} classes={classes} />
          </TabsContent>
          <TabsContent value="info" className="mt-4 sm:mt-6">
            {(isComboCourse(course) || comboComponentIds.length > 0) ? (
              <ComboTabs
                combo={course}
                comboModules={modules}
                comboClasses={classes}
                componentCourseIds={comboComponentIds}
              />
            ) : (
              <CourseInfoTab course={course} modules={modules} classes={classes} />
            )}
          </TabsContent>
          <TabsContent value="classes" className="mt-4 sm:mt-6">
            <CourseClassesTab course={course} classes={classes} onChange={setClasses} />
          </TabsContent>
          <TabsContent value="landing" className="mt-4 sm:mt-6">
            <CourseLandingTab course={course} modules={modules} classes={classes} />
          </TabsContent>
          <TabsContent value="whatsapp" className="mt-4 sm:mt-6">
            <CourseWhatsAppTab course={course} modules={modules} classes={classes} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CourseDetail;
