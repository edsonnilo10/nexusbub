import {
  CourseFull, CourseModule, CourseClass, ClassStatus,
  formatBRL, unitLabel, formatClassDateRange, classStatusLabel,
} from "./courseHelpers";

const parseDate = (date: string | null | undefined): Date | null => {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

const upcomingClasses = (classes: CourseClass[]): CourseClass[] => {
  const today = new Date().toISOString().slice(0, 10);
  return [...classes]
    .filter((c) => c.start_date && c.status !== "encerrada" && c.start_date >= today)
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
};

const allFutureOrCurrent = (classes: CourseClass[]): CourseClass[] => {
  return [...classes]
    .filter((c) => c.status !== "encerrada")
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
};

const nextClass = (classes: CourseClass[]): CourseClass | null => {
  const ordered = [...classes].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  return ordered.find((c) => c.status === "atual") ||
         ordered.find((c) => c.status === "proxima") ||
         ordered.find((c) => c.status === "aguardando_confirmacao") ||
         ordered[0] || null;
};

const statusEmoji = (status: ClassStatus | string): string => {
  switch (status) {
    case "atual": return "🟢";
    case "proxima": return "✅";
    case "aguardando_confirmacao": return "🟡";
    case "encerrada": return "⚪";
    default: return "📅";
  }
};

const locationFor = (course: CourseFull, cls: CourseClass | null): string => {
  if (cls?.location) return cls.location;
  return `Escola NEXUS de Ultrassonografia – ${unitLabel(course.unit)}/${course.unit === "brasilia" ? "DF" : "SP"}`;
};

/** Bloco de turmas formatado para WhatsApp — usado no editor e no template completo */
export const classesBlock = (classes: CourseClass[]): string => {
  const list = allFutureOrCurrent(classes);
  if (list.length === 0) return "_Datas a confirmar_";

  const lines: string[] = ["🗓️ *DATAS DAS TURMAS*", ""];
  list.forEach((c) => {
    const range = formatClassDateRange(c.start_date, c.end_date);
    lines.push(`${statusEmoji(c.status)} *${range}*`);
    lines.push(`   _${classStatusLabel(c.status)}_`);
    if (c.location) lines.push(`   📍 ${c.location}`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
};

const splitToBullets = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(".") ? s : s + "."));
};

/** Mensagem completa no padrão Nexus */
export const fullMessage = (course: CourseFull, modules: CourseModule[], classes: CourseClass[]): string => {
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

  const wl = course.workload_hours ? `${course.workload_hours} horas` : "imersão";
  lines.push(
    `A Escola NEXUS apresenta uma imersão de *${wl}* projetada para transformar sua atuação clínica, unindo embasamento teórico robusto a uma carga prática intensiva com pacientes reais.`
  );
  lines.push("");

  // Bloco de TURMAS (todas as futuras, com status)
  lines.push(classesBlock(classes));
  lines.push("");

  // Local padrão
  lines.push(`📍 *Local:* ${locationFor(course, cls)}`);
  lines.push("");

  // Módulos
  if (modules.length > 0) {
    lines.push(`*O QUE VOCÊ VAI DOMINAR*`);
    lines.push("");
    lines.push(`O programa foca na interpretação de padrões, diagnóstico e conduta clínica nas principais aplicações abordadas no curso.`);
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

  if (course.highlights) {
    lines.push(`*DIFERENCIAIS DETERMINANTES*`);
    lines.push("");
    splitToBullets(course.highlights).forEach((b) => lines.push(`✅ ${b}`));
    lines.push("");
  }

  lines.push(`🕒 *CRONOGRAMA E LOGÍSTICA*`);
  lines.push("");
  if (course.workload_hours) lines.push(`*Carga Horária Total:* ${course.workload_hours} horas`);
  if (course.modality) lines.push(`*Modalidade:* ${course.modality}`);
  lines.push("");

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

/** Mensagem curta */
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

  // Apenas as próximas (sem encerradas)
  const upcoming = upcomingClasses(classes);
  if (upcoming.length > 0) {
    lines.push("🗓️ *Próximas turmas:*");
    upcoming.slice(0, 3).forEach((c) => {
      lines.push(`${statusEmoji(c.status)} ${formatClassDateRange(c.start_date, c.end_date)} _(${classStatusLabel(c.status)})_`);
    });
    lines.push("");
  }

  lines.push(`📍 *Local:* ${locationFor(course, cls)}`);
  if (course.workload_hours) lines.push(`🕒 *Carga Horária:* ${course.workload_hours} horas`);

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

/** Follow-up */
export const followUpMessage = (course: CourseFull, classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const range = cls?.start_date ? formatClassDateRange(cls.start_date, cls.end_date) : null;
  const lines = [
    `Olá! 👋`,
    "",
    `Passando para reforçar a oportunidade do *${course.name}* na *Escola NEXUS de Ultrassonografia – ${unitLabel(course.unit)}*.`,
    "",
  ];
  if (range && cls) {
    lines.push(`🗓️ *Próxima turma:* ${range}`);
    lines.push(`${statusEmoji(cls.status)} _${classStatusLabel(cls.status)}_`);
    lines.push("");
  }
  lines.push(`Posso tirar alguma dúvida ou te enviar o conteúdo programático completo? 😊`);
  return lines.join("\n");
};
