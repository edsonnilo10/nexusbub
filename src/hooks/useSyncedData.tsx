import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClassEnrollment {
  id: string;
  unit: "sao_paulo" | "brasilia";
  course_id: string | null;
  course_name: string;
  class_label: string | null;
  class_start_date: string | null;
  class_end_date: string | null;
  student_count: number;
  source_sheet: string | null;
  synced_at: string;
}

export interface PaidStudent {
  id: string;
  student_name: string;
  student_email: string | null;
  student_phone: string | null;
  course_id: string | null;
  course_name: string | null;
  class_label: string | null;
  class_start_date: string | null;
  payment_status: string;
  contract_status: string | null;
  amount: number | null;
  payment_date: string | null;
  source_sheet: string | null;
  notes: string | null;
  synced_at: string;
}

export interface CalendarEvent {
  id: string;
  unit: "sao_paulo" | "brasilia";
  course_id: string | null;
  course_name: string;
  event_label: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  coordinator: string | null;
  source_sheet: string | null;
  notes: string | null;
  synced_at: string;
}

export const useSyncedData = (courseId?: string) => {
  const [classEnrollments, setClassEnrollments] = useState<ClassEnrollment[]>([]);
  const [paidStudents, setPaidStudents] = useState<PaidStudent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let qClass = supabase.from("enrollments_by_class").select("*").order("class_start_date", { ascending: true });
    let qPaid = supabase.from("paid_students").select("*").order("student_name", { ascending: true });
    let qCal = supabase.from("calendar_events").select("*").order("start_date", { ascending: true });
    if (courseId) {
      qClass = qClass.eq("course_id", courseId);
      qPaid = qPaid.eq("course_id", courseId);
      qCal = qCal.eq("course_id", courseId);
    }
    const [{ data: cls }, { data: paid }, { data: cal }] = await Promise.all([qClass, qPaid, qCal]);
    setClassEnrollments((cls as ClassEnrollment[]) || []);
    setPaidStudents((paid as PaidStudent[]) || []);
    setCalendarEvents((cal as CalendarEvent[]) || []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  return { classEnrollments, paidStudents, calendarEvents, loading, reload: load };
};
