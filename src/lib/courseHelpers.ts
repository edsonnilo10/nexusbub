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

export interface CourseClass {
  id: string;
  course_id: string;
  start_date: string | null;
  end_date: string | null;
  status: "atual" | "proxima" | "encerrada";
  location: string | null;
  notes: string | null;
}
