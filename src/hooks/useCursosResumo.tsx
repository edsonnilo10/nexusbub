import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTurmaYear } from "@/lib/turmaUtils";

export interface CursoResumo {
  id: string;
  codigo: string;
  nome: string;
  unidade: "sao_paulo" | "brasilia";
  vagas: number;
  pagos: number;
  pre: number;
  total: number;
  vagasRestantes: number;
}

const yearFromRow = (row: { class_label?: string | null; class_start_date?: string | null }): number | undefined => {
  const fromCode = getTurmaYear(row.class_label || undefined);
  if (fromCode) return fromCode;
  if (row.class_start_date) {
    const y = new Date(row.class_start_date + "T00:00:00").getFullYear();
    if (!Number.isNaN(y)) return y;
  }
  return undefined;
};

export function useCursosResumo(year?: number) {
  return useQuery<CursoResumo[]>({
    queryKey: ["cursos-resumo", year ?? "all"],
    queryFn: async () => {
      const [coursesRes, enrollRes, paidRes] = await Promise.all([
        supabase.from("courses").select("id, name, unit, slug"),
        supabase
          .from("enrollments_by_class")
          .select("course_id, course_name, unit, student_count, class_label, class_start_date"),
        supabase
          .from("paid_students")
          .select("course_id, course_name, payment_status, class_label, class_start_date"),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (enrollRes.error) throw enrollRes.error;
      if (paidRes.error) throw paidRes.error;

      const courses = coursesRes.data || [];
      const enrollments = enrollRes.data || [];
      const paid = paidRes.data || [];

      const matchYear = (rowYear?: number) => {
        if (!year) return true;
        return rowYear === year;
      };

      // Agregar pagos por course_id (filtrado por ano)
      const pagosByCourse = new Map<string, number>();
      for (const p of paid) {
        if (!p.course_id) continue;
        const status = (p.payment_status || "").toLowerCase();
        if (!status.includes("pago")) continue;
        if (!matchYear(yearFromRow(p))) continue;
        pagosByCourse.set(p.course_id, (pagosByCourse.get(p.course_id) || 0) + 1);
      }

      // Agregar total de matriculados (student_count) por course_id (filtrado por ano)
      const totalByCourse = new Map<string, number>();
      for (const e of enrollments) {
        if (!e.course_id) continue;
        if (!matchYear(yearFromRow(e))) continue;
        totalByCourse.set(e.course_id, (totalByCourse.get(e.course_id) || 0) + (e.student_count || 0));
      }

      const resumo: CursoResumo[] = courses.map((c) => {
        const pagos = pagosByCourse.get(c.id) || 0;
        const totalEnroll = totalByCourse.get(c.id) || 0;
        const total = Math.max(totalEnroll, pagos);
        const pre = Math.max(0, total - pagos);
        const vagas = 0;
        const vagasRestantes = vagas - total;
        return {
          id: c.id,
          codigo: c.slug || c.id.slice(0, 8),
          nome: c.name,
          unidade: c.unit as "sao_paulo" | "brasilia",
          vagas,
          pagos,
          pre,
          total,
          vagasRestantes,
        };
      });

      return resumo.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
