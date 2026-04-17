import { CourseFull, CourseModule, CourseClass, formatBRL, unitLabel } from "./courseHelpers";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const parseDate = (date: string | null | undefined): Date | null => {
  if (!date) return null;
  try {
    const d = new Date(date + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

/** "18 a 20 de Junho de 2026" ou "30 de Junho a 02 de Julho de 2026" */
const formatDateRange = (start: string | null, end: string | null): string | null => {
  const s = parseDate(start);
  if (!s) return null;
  const e = parseDate(end);
  const sd = String(s.getDate()).padStart(2, "0");
  const sm = MONTHS_PT[s.getMonth()];
  const sy = s.getFullYear();
  if (!e) return `${sd} de ${sm} de ${sy}`;
  const ed = String(e.getDate()).padStart(2, "0");
  const em = MONTHS_PT[e.getMonth()];
  const ey = e.getFullYear();
  if (sm === em && sy === ey) return `${sd} a ${ed} de ${sm} de ${sy}`;
  if (sy === ey) return `${sd} de ${sm} a ${ed} de ${em} de ${sy}`;
  return `${sd} de ${sm} de ${sy} a ${ed} de ${em} de ${ey}`;
};

const nextClass = (classes: CourseClass[]): CourseClass | null => {
  const ordered = [...classes].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  return ordered.find((c) => c.status === "atual") ||
         ordered.find((c) => c.status === "proxima") ||
         ordered[0] || null;
};

const statusLabel = (status: string | undefined): string => {
  switch (status) {
    case "atual": return "Turma em andamento";
    case "proxima": return "Matrículas em andamento (Vagas Limitadas)";
    case "encerrada": return "Turma encerrada";
    default: return "Matrículas em andamento";
  }
};

/** Divide texto em frases curtas para virar bullets */
const splitToBullets = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(".") ? s : s + "."));
};

const locationFor = (course: CourseFull, cls: CourseClass | null): string => {
  if (cls?.location) return cls.location;
  return `Escola NEXUS de Ultrassonografia – ${unitLabel(course.unit)}/${course.unit === "brasilia" ? "DF" : "SP"}`;
};

/** Mensagem completa no padrão Nexus (formato oficial) */
export const fullMessage = (course: CourseFull, modules: CourseModule[], classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const year = parseDate(cls?.start_date)?.getFullYear() || new Date().getFullYear() + 1;
  const lines: string[] = [];

  // Cabeçalho
  lines.push(`*${course.name.toUpperCase()} – NEXUS ${year}*`);
  lines.push("");

  // Subtítulo / chamada
  if (course.description) {
    const firstSentence = course.description.split(/(?<=[.!?])\s/)[0];
    lines.push(`_${firstSentence}_`);
    lines.push("");
  }

  // Parágrafo de apresentação
  const wl = course.workload_hours ? `${course.workload_hours} horas` : "imersão";
  lines.push(
    `A Escola NEXUS apresenta uma imersão de *${wl}* projetada para transformar sua atuação clínica, unindo embasamento teórico robusto a uma carga prática intensiva com pacientes reais.`
  );
  lines.push("");

  // Local / Data / Status
  lines.push(`📍 *Local:* ${locationFor(course, cls)}`);
  const range = formatDateRange(cls?.start_date || null, cls?.end_date || null);
  if (range) lines.push(`🗓️ *Data:* ${range}`);
  lines.push(`⚠️ *Status:* ${statusLabel(cls?.status)}`);
  lines.push("");

  // O que vai dominar (módulos)
  if (modules.length > 0) {
    lines.push(`*O QUE VOCÊ VAI DOMINAR*`);
    lines.push("");
    lines.push(
      `O programa foca na interpretação de padrões, diagnóstico e conduta clínica nas principais aplicações abordadas no curso.`
    );
    lines.push("");
    modules
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((m) => {
        const wlm = m.workload_hours ? ` _(${m.workload_hours}h)_` : "";
        lines.push(`▪️ *${m.title}*${wlm}`);
        if (m.description) lines.push(m.description.trim());
      });
    lines.push("");
  }

  // Diferenciais
  if (course.highlights) {
    lines.push(`*DIFERENCIAIS DETERMINANTES*`);
    lines.push("");
    splitToBullets(course.highlights).forEach((b) => lines.push(`✅ ${b}`));
    lines.push("");
  }

  // Cronograma e logística
  lines.push(`🕒 *CRONOGRAMA E LOGÍSTICA*`);
  lines.push("");
  if (course.workload_hours) lines.push(`*Carga Horária Total:* ${course.workload_hours} horas`);
  if (course.modality) lines.push(`*Modalidade:* ${course.modality}`);
  if (range) lines.push(`*Período:* ${range}`);
  lines.push("");

  // Investimento
  if (course.price) {
    lines.push(`💰 *INVESTIMENTO*`);
    lines.push("");
    lines.push(`À vista: *${formatBRL(course.price)}*`);
    if (course.installments && course.installments > 1) {
      lines.push(`Parcelado: *${course.installments}x de ${formatBRL(course.price / course.installments)}*`);
    }
    if (course.payment_methods) lines.push(`_${course.payment_methods}_`);
    lines.push("");
  }

  lines.push(`🎓 *Pré-Requisito:* Graduação em Medicina.`);
  lines.push("");
  lines.push(`Posso te ajudar a garantir sua vaga? 🎯`);

  return lines.join("\n");
};

/** Versão curta — mesmo padrão visual, mais enxuta */
export const shortMessage = (course: CourseFull, classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const year = parseDate(cls?.start_date)?.getFullYear() || new Date().getFullYear() + 1;
  const lines: string[] = [];

  lines.push(`*${course.name.toUpperCase()} – NEXUS ${year}*`);
  lines.push("");

  if (course.description) {
    const firstSentence = course.description.split(/(?<=[.!?])\s/)[0];
    lines.push(`_${firstSentence}_`);
    lines.push("");
  }

  lines.push(`📍 *Local:* ${locationFor(course, cls)}`);
  const range = formatDateRange(cls?.start_date || null, cls?.end_date || null);
  if (range) lines.push(`🗓️ *Data:* ${range}`);
  if (course.workload_hours) lines.push(`🕒 *Carga Horária:* ${course.workload_hours} horas`);
  lines.push(`⚠️ *Status:* ${statusLabel(cls?.status)}`);

  if (course.price) {
    lines.push("");
    const inst = course.installments && course.installments > 1
      ? ` ou *${course.installments}x de ${formatBRL(course.price / course.installments)}*`
      : "";
    lines.push(`💰 *Investimento:* ${formatBRL(course.price)}${inst}`);
  }

  lines.push("");
  lines.push(`🎓 *Pré-Requisito:* Graduação em Medicina.`);
  lines.push("");
  lines.push(`Quer garantir sua vaga? Me chama aqui! 👇`);

  return lines.join("\n");
};

/** Follow-up no mesmo tom */
export const followUpMessage = (course: CourseFull, classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const range = formatDateRange(cls?.start_date || null, cls?.end_date || null);
  const lines = [
    `Olá! 👋`,
    "",
    `Passando para reforçar a oportunidade do *${course.name}* na *Escola NEXUS de Ultrassonografia – ${unitLabel(course.unit)}*.`,
    "",
  ];
  if (range) {
    lines.push(`🗓️ *Data:* ${range}`);
    lines.push(`⚠️ *Status:* ${statusLabel(cls?.status)}`);
    lines.push("");
  }
  lines.push(`Posso tirar alguma dúvida ou te enviar o conteúdo programático completo? 😊`);
  return lines.join("\n");
};
