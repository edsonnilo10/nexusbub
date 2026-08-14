import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatBRL = (value: number | null | undefined): string => {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return "—";
  try {
    return format(new Date(date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

export const formatDateShort = (date: string | null | undefined): string => {
  if (!date) return "—";
  try {
    return format(new Date(date + "T00:00:00"), "dd/MM/yyyy");
  } catch {
    return "—";
  }
};

export const courseTypeLabel = (type: string): string => {
  return type === "pos_graduacao" ? "Pós-graduação" : "Curso modular";
};

export type CourseUnit = "sao_paulo" | "brasilia";

export const unitLabel = (unit: CourseUnit | string): string =>
  unit === "brasilia" ? "Brasília" : "São Paulo";

export const unitShort = (unit: CourseUnit | string): string =>
  unit === "brasilia" ? "BSB" : "SP";

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
};

export interface CourseFull {
  id: string;
  name: string;
  slug: string | null;
  type: "pos_graduacao" | "modular";
  unit: CourseUnit;
  description: string | null;
  cover_url: string | null;
  workload_hours: number | null;
  workload_breakdown: string | null;
  modality: string | null;
  price: number | null;
  installments: number | null;
  payment_methods: string | null;
  highlights: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  workload_hours: number | null;
  order_index: number;
}

export type ClassStatus = "atual" | "proxima" | "aguardando_confirmacao" | "encerrada";

export interface CourseClass {
  id: string;
  course_id: string;
  start_date: string | null;
  end_date: string | null;
  status: ClassStatus;
  location: string | null;
  notes: string | null;
}

export const classStatusLabel = (status: ClassStatus | string): string => {
  switch (status) {
    case "atual": return "Turma em andamento";
    case "proxima": return "Confirmada";
    case "aguardando_confirmacao": return "Aguardando confirmação";
    case "encerrada": return "Encerrada";
    default: return status;
  }
};

/** Cor semântica (badge/chip) para cada status */
export const classStatusVariant = (status: ClassStatus | string): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "atual": return "default";
    case "proxima": return "secondary";
    case "aguardando_confirmacao": return "outline";
    case "encerrada": return "outline";
    default: return "outline";
  }
};

const MONTHS_PT_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Ex.: "18 a 20 de Junho de 2026" / "30 de Junho a 02 de Julho de 2026" */
/** Heurística: o curso é um combo? */
export const isComboCourse = (course: Pick<CourseFull, "name" | "slug">): boolean => {
  const n = (course.name || "").toLowerCase();
  const s = (course.slug || "").toLowerCase();
  return n.includes(" + ") || s.includes("combo") || s.startsWith("basico-giob-trvg");
};

export const formatClassDateRange = (start: string | null, end: string | null): string => {
  if (!start) return "—";
  const s = new Date(start + "T00:00:00");
  if (isNaN(s.getTime())) return "—";
  const sd = String(s.getDate()).padStart(2, "0");
  const sm = MONTHS_PT_LONG[s.getMonth()];
  const sy = s.getFullYear();
  // Sem data de fim — mostra só o início
  if (!end) return `${sd} de ${sm} de ${sy}`;
  const e = new Date(end + "T00:00:00");
  if (isNaN(e.getTime())) return `${sd} de ${sm} de ${sy}`;
  const ed = String(e.getDate()).padStart(2, "0");
  const em = MONTHS_PT_LONG[e.getMonth()];
  const ey = e.getFullYear();
  // Mesma data exata — mostra só uma vez (evita "01 a 01 de Junho de 2026")
  if (sd === ed && sm === em && sy === ey) return `${sd} de ${sm} de ${sy}`;
  // Mesmo mês e ano — "18 a 20 de Junho de 2026"
  if (sm === em && sy === ey) return `${sd} a ${ed} de ${sm} de ${sy}`;
  // Mesmo ano, meses diferentes — "30 de Junho a 02 de Julho de 2026"
  if (sy === ey) return `${sd} de ${sm} a ${ed} de ${em} de ${sy}`;
  // Anos diferentes
  return `${sd} de ${sm} de ${sy} a ${ed} de ${em} de ${ey}`;
};
