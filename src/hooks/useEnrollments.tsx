import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "pendente" | "pago" | "isento" | "cancelado";
export type ContractStatus = "sem_contrato" | "em_contrato" | "assinado";

export interface Enrollment {
  id: string;
  course_id: string;
  class_id: string | null;
  student_name: string;
  student_email: string | null;
  student_phone: string | null;
  payment_status: PaymentStatus;
  contract_status: ContractStatus;
  class_start_date: string | null;
  class_end_date: string | null;
  class_label: string | null;
  source_sheet: string | null;
  notes: string | null;
  synced_at: string;
}

export const useEnrollments = (courseId?: string) => {
  const [data, setData] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("course_enrollments")
      .select("*")
      .eq("course_id", courseId)
      .order("class_start_date", { ascending: true })
      .order("student_name", { ascending: true });
    setData((rows as Enrollment[]) || []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  return { enrollments: data, loading, reload: load };
};
