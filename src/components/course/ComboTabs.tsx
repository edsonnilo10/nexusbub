import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CourseFull, CourseModule, CourseClass } from "@/lib/courseHelpers";
import { CourseInfoTab } from "./CourseInfoTab";
import { loadCourseClasses } from "@/lib/classGroupsResolver";

interface Props {
  combo: CourseFull;
  comboModules: CourseModule[];
  comboClasses: CourseClass[];
  componentCourseIds: string[];
}

interface ComponentBundle {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

const stripPrefix = (mods: CourseModule[]): CourseModule[] =>
  mods.map((m) => ({ ...m, title: m.title.replace(/^\[(GIOB|TRVG)\]\s*/i, "") }));

export const ComboTabs = ({ combo, comboModules, comboClasses, componentCourseIds }: Props) => {
  const [components, setComponents] = useState<ComponentBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const bundles: ComponentBundle[] = [];
      for (const id of componentCourseIds) {
        const [{ data: c }, { data: m }, cls] = await Promise.all([
          supabase.from("courses").select("*").eq("id", id).maybeSingle(),
          supabase.from("course_modules").select("*").eq("course_id", id).order("order_index"),
          loadCourseClasses(id),
        ]);
        if (c) {
          bundles.push({
            course: c as CourseFull,
            modules: (m as CourseModule[]) || [],
            classes: cls,
          });
        }
      }
      if (!cancelled) {
        setComponents(bundles);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [componentCourseIds.join(",")]);

  // Cleaner module list for combo tab (remove [GIOB]/[TRVG] prefixes — keep order)
  const cleanComboModules = stripPrefix(comboModules);

  return (
    <Tabs defaultValue="combo" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="combo">Combo completo</TabsTrigger>
        {components.map((b) => (
          <TabsTrigger key={b.course.id} value={b.course.id}>
            Só {shortName(b.course.name)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="combo" className="mt-4">
        <CourseInfoTab course={combo} modules={cleanComboModules} classes={comboClasses} />
      </TabsContent>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        components.map((b) => (
          <TabsContent key={b.course.id} value={b.course.id} className="mt-4">
            <CourseInfoTab course={b.course} modules={b.modules} classes={b.classes} />
          </TabsContent>
        ))
      )}
    </Tabs>
  );
};

const shortName = (name: string): string => {
  const upper = name.toUpperCase();
  if (upper.includes("GIOB")) return "GIOB";
  if (upper.includes("TRVG")) return "TRVG";
  if (upper.includes("TRANSVAGINAL")) return "TRVG";
  // Fallback: first 2 words
  return name.split(/\s+/).slice(0, 2).join(" ");
};
