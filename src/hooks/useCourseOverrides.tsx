import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CourseOverrides {
  wa_short: string | null;
  wa_full: string | null;
  wa_followup: string | null;
  wa_investment: string | null;
  proposal_price: string | null;
  proposal_start_date: string | null;
  proposal_end_date: string | null;
  proposal_coordinators: string | null;
  proposal_installments: number | null;
  proposal_class_id: string | null;
}

const EMPTY: CourseOverrides = {
  wa_short: null,
  wa_full: null,
  wa_followup: null,
  wa_investment: null,
  proposal_price: null,
  proposal_start_date: null,
  proposal_end_date: null,
  proposal_coordinators: null,
  proposal_installments: null,
  proposal_class_id: null,
};

/**
 * Hook que carrega/salva personalizações do usuário logado para um curso.
 * Cada usuário tem sua própria linha (RLS garante isolamento total).
 */
export const useCourseOverrides = (courseId: string | undefined) => {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<CourseOverrides>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega overrides existentes
  useEffect(() => {
    if (!courseId || !user) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_course_overrides")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setOverrides({
          wa_short: data.wa_short,
          wa_full: data.wa_full,
          wa_followup: data.wa_followup,
          wa_investment: (data as any).wa_investment ?? null,
          proposal_price: data.proposal_price,
          proposal_start_date: data.proposal_start_date,
          proposal_end_date: data.proposal_end_date,
          proposal_coordinators: data.proposal_coordinators,
          proposal_installments: (data as any).proposal_installments ?? null,
          proposal_class_id: (data as any).proposal_class_id ?? null,
        });
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, user]);

  /** Salva (upsert) com debounce de 600ms */
  const save = useCallback(
    (patch: Partial<CourseOverrides>) => {
      if (!courseId || !user) return;
      setOverrides((prev) => ({ ...prev, ...patch }));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await supabase.from("user_course_overrides").upsert(
          {
            user_id: user.id,
            course_id: courseId,
            ...patch,
          },
          { onConflict: "user_id,course_id" }
        );
      }, 600);
    },
    [courseId, user]
  );

  return { overrides, loaded, save };
};
