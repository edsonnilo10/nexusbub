import {
  CircleDollarSign,
  Clock,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  CreditCard,
  UserPlus,
  FileText,
  Users,
  Building2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import {
  CourseFull,
  CourseModule,
  CourseClass,
  formatBRL,
  formatClassDateRange,
  courseTypeLabel,
} from "@/lib/courseHelpers";

export type FaqMode = "local" | "ai";

export interface FaqPreset {
  id: string;
  question: string;
  icon: LucideIcon;
  mode: FaqMode;
  /** Resposta local determinística (obrigatória se mode === "local") */
  answer?: (course: CourseFull, modules: CourseModule[], classes: CourseClass[]) => string;
}

const upcomingClasses = (classes: CourseClass[]) =>
  classes
    .filter((c) => c.status !== "encerrada")
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));

/* ─────────── Respostas locais ─────────── */

const answerPrice = (course: CourseFull): string => {
  if (course.price == null) {
    return "O valor deste curso ainda não está cadastrado — consulte a secretaria.";
  }
  const lines = [`Investimento: *${formatBRL(course.price)}*`];
  if (course.installments && course.installments > 1) {
    lines.push(`Parcelado em até *${course.installments}x de ${formatBRL(course.price / course.installments)}*`);
  }
  if (course.payment_methods) {
    lines.push(`Formas de pagamento: ${course.payment_methods}`);
  }
  return lines.join("\n");
};

const answerDuration = (course: CourseFull, _m: CourseModule[], classes: CourseClass[]): string => {
  const parts: string[] = [];
  if (course.workload_hours) {
    parts.push(`Carga horária total: *${course.workload_hours} horas*`);
  }
  const nextClasses = upcomingClasses(classes).slice(0, 3);
  if (nextClasses.length) {
    parts.push("");
    parts.push("Próximas turmas:");
    for (const c of nextClasses) {
      parts.push(`• ${formatClassDateRange(c.start_date, c.end_date)}`);
    }
  }
  if (!parts.length) return "As informações de duração ainda não estão cadastradas — consulte a secretaria.";
  return parts.join("\n");
};

const answerModality = (course: CourseFull): string => {
  if (!course.modality) return "A modalidade ainda não está cadastrada — consulte a secretaria.";
  return `Modalidade: *${course.modality}*`;
};

const answerNextClasses = (_c: CourseFull, _m: CourseModule[], classes: CourseClass[]): string => {
  const nextClasses = upcomingClasses(classes);
  if (!nextClasses.length) {
    return "Ainda não temos turmas confirmadas para este curso — consulte a secretaria para novidades.";
  }
  const lines = ["Próximas turmas confirmadas:"];
  for (const c of nextClasses.slice(0, 5)) {
    const loc = c.location ? ` — ${c.location}` : "";
    lines.push(`• ${formatClassDateRange(c.start_date, c.end_date)}${loc}`);
  }
  return lines.join("\n");
};

const answerCertificate = (course: CourseFull): string => {
  const wl = course.workload_hours ? ` de *${course.workload_hours} horas*` : "";
  const tipo = courseTypeLabel(course.type);
  return `Sim, todos os alunos recebem certificado${wl} ao concluir o curso (${tipo}).`;
};

const answerPayment = (course: CourseFull): string => {
  const parts: string[] = [];
  if (course.payment_methods) parts.push(`Formas de pagamento: ${course.payment_methods}`);
  if (course.price != null && course.installments && course.installments > 1) {
    parts.push(`Parcelamos em até *${course.installments}x de ${formatBRL(course.price / course.installments)}*.`);
  }
  if (!parts.length) return "As formas de pagamento ainda não estão cadastradas — consulte a secretaria.";
  return parts.join("\n");
};

const answerLocation = (_c: CourseFull, _m: CourseModule[], classes: CourseClass[]): string => {
  const nextClasses = upcomingClasses(classes);
  const withLoc = nextClasses.filter((c) => c.location);
  if (!withLoc.length) {
    return "O local das aulas ainda não está cadastrado — consulte a secretaria.";
  }
  const unique = Array.from(new Set(withLoc.map((c) => c.location!)));
  if (unique.length === 1) return `As aulas acontecem em: *${unique[0]}*`;
  const lines = ["Locais das próximas turmas:"];
  for (const c of withLoc.slice(0, 5)) {
    lines.push(`• ${formatClassDateRange(c.start_date, c.end_date)} — ${c.location}`);
  }
  return lines.join("\n");
};

/* ─────────── Presets ─────────── */

export const FAQ_PRESETS: FaqPreset[] = [
  { id: "price", question: "Quanto custa?", icon: CircleDollarSign, mode: "local", answer: answerPrice },
  { id: "who", question: "Quem pode fazer este curso?", icon: Users, mode: "ai" },
  { id: "duration", question: "Quanto tempo dura?", icon: Clock, mode: "local", answer: answerDuration },
  { id: "modality", question: "É presencial, online ou híbrido?", icon: MapPin, mode: "local", answer: answerModality },
  { id: "next", question: "Quais as próximas turmas?", icon: Calendar, mode: "local", answer: answerNextClasses },
  { id: "content", question: "Qual o conteúdo programático?", icon: BookOpen, mode: "ai" },
  { id: "certificate", question: "Emite certificado?", icon: Award, mode: "local", answer: answerCertificate },
  { id: "payment", question: "Formas de pagamento aceitas?", icon: CreditCard, mode: "local", answer: answerPayment },
  { id: "enroll", question: "Como faço para me inscrever?", icon: UserPlus, mode: "ai" },
  { id: "material", question: "Tem material de apoio ou gravação?", icon: FileText, mode: "ai" },
  { id: "location", question: "Onde acontecem as aulas?", icon: Building2, mode: "local", answer: answerLocation },
  { id: "coordinator", question: "Quem é o coordenador?", icon: HelpCircle, mode: "ai" },
];

/**
 * Formata a resposta bruta da IA (ou local) para o padrão WhatsApp:
 * - Remove markdown Bold/Italic HTML style, mantém *bold* e _italic_ do WhatsApp
 * - Colapsa múltiplas quebras
 */
export const formatForWhatsApp = (text: string): string =>
  text
    .replace(/\*\*([^*\n]+)\*\*/g, "*$1*") // **bold** -> *bold*
    .replace(/__([^_\n]+)__/g, "_$1_") // __italic__ -> _italic_
    .replace(/\n{3,}/g, "\n\n")
    .trim();
