import type { LucideIcon } from "lucide-react";
import {
  DollarSign, Users, Clock, MapPin, Calendar, ListChecks,
  Award, CreditCard, UserPlus, PlayCircle, Building2, GraduationCap,
} from "lucide-react";
import { CourseFull, CourseModule, CourseClass, formatClassDateRange, classStatusLabel } from "./courseHelpers";

export type FaqMode = "local" | "ai";

export interface FaqPreset {
  id: string;
  question: string;
  icon: LucideIcon;
  mode: FaqMode;
  answer?: (course: CourseFull, modules: CourseModule[], classes: CourseClass[]) => string;
}

const formatPrice = (v: number | null) =>
  v == null ? null : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const upcoming = (classes: CourseClass[]) =>
  [...classes]
    .filter((c) => c.status !== "encerrada" && c.start_date)
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));

const priceAnswer = (course: CourseFull) => {
  const price = formatPrice(course.price);
  const parts: string[] = [];
  if (price) {
    if (course.installments && course.installments > 1) {
      const installment = course.price! / course.installments;
      parts.push(
        `*Investimento:* ${price} — em até *${course.installments}x* de ${formatPrice(installment)}.`,
      );
    } else {
      parts.push(`*Investimento:* ${price}.`);
    }
  } else {
    parts.push("Valores sob consulta — confirme com a secretaria para receber a proposta atualizada.");
  }
  if (course.payment_methods) parts.push(`_Formas de pagamento:_ ${course.payment_methods}.`);
  return parts.join("\n");
};

const durationAnswer = (course: CourseFull, _m: CourseModule[], classes: CourseClass[]) => {
  const parts: string[] = [];
  if (course.workload_hours) parts.push(`*Carga horária:* ${course.workload_hours}h.`);
  const next = upcoming(classes)[0];
  if (next) {
    parts.push(`_Próxima turma:_ ${formatClassDateRange(next.start_date, next.end_date)}.`);
  }
  return parts.length ? parts.join("\n") : "Duração ainda não cadastrada — confirme com a secretaria.";
};

const modalityAnswer = (course: CourseFull) => {
  if (!course.modality) return "Modalidade não cadastrada — confirme com a secretaria.";
  return `*Modalidade:* ${course.modality}.`;
};

const nextClassesAnswer = (_c: CourseFull, _m: CourseModule[], classes: CourseClass[]) => {
  const up = upcoming(classes).slice(0, 5);
  if (!up.length) return "Sem turmas confirmadas no momento — a coordenação pode te avisar assim que abrirem novas datas.";
  const lines = up.map(
    (c) => `• ${formatClassDateRange(c.start_date, c.end_date)} — _${classStatusLabel(c.status)}_${c.location ? ` (${c.location})` : ""}`,
  );
  return `*Próximas turmas:*\n${lines.join("\n")}`;
};

const certificateAnswer = (course: CourseFull) => {
  const hours = course.workload_hours ? `com *${course.workload_hours}h* certificadas` : "com a carga horária cadastrada";
  const type = course.type === "pos_graduacao" ? "certificado de pós-graduação" : "certificado de conclusão";
  return `Sim — emitimos ${type} ${hours} ao final do curso.`;
};

const paymentAnswer = (course: CourseFull) => {
  if (!course.payment_methods) {
    return "Formas de pagamento não cadastradas — a secretaria envia todas as opções (Pix, cartão, boleto).";
  }
  return `*Formas de pagamento aceitas:*\n${course.payment_methods}`;
};

const locationAnswer = (course: CourseFull, _m: CourseModule[], classes: CourseClass[]) => {
  const up = upcoming(classes);
  const withLoc = up.find((c) => c.location) || up[0];
  const unit = course.unit === "sao_paulo" ? "São Paulo" : "Brasília";
  if (course.modality?.toLowerCase().includes("online") || course.modality?.toLowerCase().includes("ead")) {
    return `As aulas são *online*${withLoc?.location ? ` (${withLoc.location})` : ""}.`;
  }
  if (withLoc?.location) return `As aulas acontecem em *${withLoc.location}* — unidade ${unit}.`;
  return `As aulas acontecem na unidade *${unit}*. A secretaria confirma o endereço completo antes do início.`;
};

export const FAQ_PRESETS: FaqPreset[] = [
  { id: "price", question: "Quanto custa?", icon: DollarSign, mode: "local", answer: priceAnswer },
  { id: "audience", question: "Quem pode fazer este curso?", icon: Users, mode: "ai" },
  { id: "duration", question: "Quanto tempo dura?", icon: Clock, mode: "local", answer: durationAnswer },
  { id: "modality", question: "É presencial, online ou híbrido?", icon: PlayCircle, mode: "local", answer: modalityAnswer },
  { id: "next", question: "Quais as próximas turmas?", icon: Calendar, mode: "local", answer: nextClassesAnswer },
  { id: "content", question: "Qual o conteúdo programático?", icon: ListChecks, mode: "ai" },
  { id: "certificate", question: "Emite certificado? Qual carga horária?", icon: Award, mode: "local", answer: certificateAnswer },
  { id: "payment", question: "Formas de pagamento aceitas?", icon: CreditCard, mode: "local", answer: paymentAnswer },
  { id: "enroll", question: "Como faço para me inscrever?", icon: UserPlus, mode: "ai" },
  { id: "support", question: "Tem material de apoio ou gravação?", icon: PlayCircle, mode: "ai" },
  { id: "location", question: "Onde acontecem as aulas?", icon: Building2, mode: "local", answer: locationAnswer },
  { id: "coordinator", question: "Quem é o coordenador?", icon: GraduationCap, mode: "ai" },
];

/**
 * Ajustes leves para deixar a resposta pronta para WhatsApp:
 * - Normaliza quebras de linha em excesso.
 * - Remove marcadores residuais (---, ###).
 * A IA já é instruída a usar *negrito* e _itálico_ no formato certo.
 */
export const formatForWhatsApp = (text: string): string => {
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
