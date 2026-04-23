import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useCursosResumo() {
  return useQuery<CursoResumo[]>({
    queryKey: ["cursos-resumo"],
    queryFn: async () => {
      const [coursesRes, enrollRes, paidRes] = await Promise.all([
        supabase.from("courses").select("id, name, unit, slug"),
        supabase.from("enrollments_by_class").select("course_id, course_name, unit, student_count"),
        supabase.from("paid_students").select("course_id, course_name, payment_status"),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (enrollRes.error) throw enrollRes.error;
      if (paidRes.error) throw paidRes.error;

      const courses = coursesRes.data || [];
      const enrollments = enrollRes.data || [];
      const paid = paidRes.data || [];

      // Agregar pagos por course_id
      const pagosByCourse = new Map<string, number>();
      for (const p of paid) {
        if (!p.course_id) continue;
        const status = (p.payment_status || "").toLowerCase();
        if (status.includes("pago")) {
          pagosByCourse.set(p.course_id, (pagosByCourse.get(p.course_id) || 0) + 1);
        }
      }

      // Agregar total de matriculados (student_count) por course_id
      const totalByCourse = new Map<string, number>();
      for (const e of enrollments) {
        if (!e.course_id) continue;
        totalByCourse.set(e.course_id, (totalByCourse.get(e.course_id) || 0) + (e.student_count || 0));
      }

      const resumo: CursoResumo[] = courses.map((c) => {
        const pagos = pagosByCourse.get(c.id) || 0;
        const totalEnroll = totalByCourse.get(c.id) || 0;
        // Se houver matriculados via enrollments_by_class, usar como total e derivar pré
        const total = Math.max(totalEnroll, pagos);
        const pre = Math.max(0, total - pagos);
        const vagas = 0; // sem coluna de vagas em courses; mantemos 0 como fallback
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
