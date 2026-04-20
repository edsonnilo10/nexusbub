import { supabase } from "@/integrations/supabase/client";
import type { CourseClass, ClassStatus } from "@/lib/courseHelpers";

type DisplayMode = "individual" | "combo_only" | "both";

type GroupRow = {
  id: string;
  unit: string;
  start_date: string;
  end_date: string;
  status: ClassStatus;
  location: string | null;
  notes: string | null;
};

type LinkRow = {
  group_id: string;
  course_id: string;
  display_mode: DisplayMode;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

/**
 * Resolve as turmas (CourseClass[]) de um curso a partir de class_groups +
 * class_group_courses, respeitando display_mode.
 *
 * Regra: se o vínculo está como "combo_only" e o curso não é o combo principal
 * dessa janela (ou seja, é um trigger), ele é OMITIDO. Caso contrário (individual
 * ou both), aparece normalmente.
 */
export const resolveCourseClassesFromGroups = async (
  courseId: string,
): Promise<CourseClass[]> => {
  // 1) pega vínculos desse curso
  const { data: myLinks, error: e1 } = await supabase
    .from("class_group_courses")
    .select("group_id, course_id, display_mode, start_date, end_date, notes")
    .eq("course_id", courseId);
  if (e1 || !myLinks || myLinks.length === 0) return [];

  // Filtra: combo_only não aparece no curso individual
  const visibleLinks = (myLinks as LinkRow[]).filter(
    (l) => l.display_mode !== "combo_only",
  );
  if (visibleLinks.length === 0) return [];

  const groupIds = Array.from(new Set(visibleLinks.map((l) => l.group_id)));

  // 2) pega as janelas
  const { data: groups, error: e2 } = await supabase
    .from("class_groups")
    .select("id, unit, start_date, end_date, status, location, notes")
    .in("id", groupIds);
  if (e2 || !groups) return [];

  const groupMap = new Map<string, GroupRow>(
    (groups as GroupRow[]).map((g) => [g.id, g]),
  );

  return visibleLinks
    .map((link) => {
      const g = groupMap.get(link.group_id);
      if (!g) return null;
      return {
        id: link.group_id, // estável p/ React keys e seleção
        course_id: courseId,
        start_date: link.start_date || g.start_date,
        end_date: link.end_date || g.end_date,
        status: g.status,
        location: g.location,
        notes: link.notes || g.notes,
      } as CourseClass;
    })
    .filter((c): c is CourseClass => c !== null);
};

/**
 * Carrega turmas combinando class_groups (preferencial) + course_classes legado.
 * Deduplica por (start_date, end_date, status).
 */
export const loadCourseClasses = async (
  courseId: string,
): Promise<CourseClass[]> => {
  const [fromGroups, legacyRes] = await Promise.all([
    resolveCourseClassesFromGroups(courseId),
    supabase.from("course_classes").select("*").eq("course_id", courseId),
  ]);
  const legacy = ((legacyRes.data || []) as CourseClass[]).map((c) => ({
    ...c,
    start_date: c.start_date,
    end_date: c.end_date,
  }));

  const all = [...fromGroups, ...legacy];
  const seen = new Set<string>();
  const out: CourseClass[] = [];
  for (const c of all) {
    const key = `${c.start_date || ""}|${c.end_date || ""}|${c.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.sort((a, b) =>
    (a.start_date || "").localeCompare(b.start_date || ""),
  );
};

/**
 * Versão global: retorna CourseClass[] para TODOS os cursos a partir de
 * class_groups + course_classes legado, respeitando display_mode e deduplicando.
 * Usado por Calendar, Dashboard e QuickMessages.
 */
export const loadAllCourseClasses = async (): Promise<CourseClass[]> => {
  const [linksRes, groupsRes, legacyRes] = await Promise.all([
    supabase
      .from("class_group_courses")
      .select("group_id, course_id, display_mode, start_date, end_date, notes"),
    supabase
      .from("class_groups")
      .select("id, unit, start_date, end_date, status, location, notes"),
    supabase.from("course_classes").select("*"),
  ]);

  const groups = new Map<string, GroupRow>(
    ((groupsRes.data || []) as GroupRow[]).map((g) => [g.id, g]),
  );

  const fromGroups: CourseClass[] = [];
  for (const link of (linksRes.data || []) as LinkRow[]) {
    if (link.display_mode === "combo_only") continue;
    const g = groups.get(link.group_id);
    if (!g) continue;
    fromGroups.push({
      id: link.group_id,
      course_id: link.course_id,
      start_date: link.start_date || g.start_date,
      end_date: link.end_date || g.end_date,
      status: g.status,
      location: g.location,
      notes: link.notes || g.notes,
    });
  }

  const legacy = ((legacyRes.data || []) as CourseClass[]) || [];
  const all = [...fromGroups, ...legacy];

  const seen = new Set<string>();
  const out: CourseClass[] = [];
  for (const c of all) {
    const key = `${c.course_id}|${c.start_date || ""}|${c.end_date || ""}|${c.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.sort((a, b) =>
    (a.start_date || "").localeCompare(b.start_date || ""),
  );
};
