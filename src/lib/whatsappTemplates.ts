import { CourseFull, CourseModule, CourseClass, formatBRL, formatDateShort, courseTypeLabel, unitLabel } from "./courseHelpers";

const nextClass = (classes: CourseClass[]): CourseClass | null => {
  const ordered = [...classes].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  return ordered.find((c) => c.status === "atual") ||
         ordered.find((c) => c.status === "proxima") ||
         ordered[0] || null;
};

export const shortMessage = (course: CourseFull, classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const lines = [
    `🩺 *${course.name}*`,
    `_${courseTypeLabel(course.type)} • Nexus ${unitLabel(course.unit)}_`,
    "",
  ];
  if (course.workload_hours) lines.push(`⏱ Carga horária: *${course.workload_hours}h*`);
  if (cls?.start_date) lines.push(`📅 Próxima turma: *${formatDateShort(cls.start_date)}*`);
  if (course.price) {
    const inst = course.installments && course.installments > 1
      ? ` ou ${course.installments}x de ${formatBRL(course.price / course.installments)}`
      : "";
    lines.push(`💰 Investimento: *${formatBRL(course.price)}*${inst}`);
  }
  lines.push("", "Quer garantir sua vaga? Me chama aqui! 👇");
  return lines.join("\n");
};

export const fullMessage = (course: CourseFull, modules: CourseModule[], classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const lines = [
    `🩺 *${course.name}*`,
    `_${courseTypeLabel(course.type)} • Nexus ${unitLabel(course.unit)}_`,
    "",
  ];
  if (course.description) lines.push(course.description, "");

  lines.push("📌 *Detalhes do curso*");
  if (course.workload_hours) lines.push(`• Carga horária: ${course.workload_hours}h`);
  if (course.modality) lines.push(`• Modalidade: ${course.modality}`);
  if (cls?.start_date) lines.push(`• Início: ${formatDateShort(cls.start_date)}`);
  if (cls?.end_date) lines.push(`• Término: ${formatDateShort(cls.end_date)}`);
  if (cls?.location) lines.push(`• Local: ${cls.location}`);
  lines.push("");

  if (modules.length > 0) {
    lines.push("📚 *Conteúdo programático*");
    modules
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((m) => {
        const wl = m.workload_hours ? ` (${m.workload_hours}h)` : "";
        lines.push(`• ${m.title}${wl}`);
      });
    lines.push("");
  }

  if (course.price) {
    lines.push("💰 *Investimento*");
    lines.push(`• À vista: ${formatBRL(course.price)}`);
    if (course.installments && course.installments > 1) {
      lines.push(`• Parcelado: ${course.installments}x de ${formatBRL(course.price / course.installments)}`);
    }
    if (course.payment_methods) lines.push(`• Formas de pagamento: ${course.payment_methods}`);
    lines.push("");
  }

  lines.push("Posso te ajudar com a inscrição? 🎯");
  return lines.join("\n");
};

export const followUpMessage = (course: CourseFull, classes: CourseClass[]): string => {
  const cls = nextClass(classes);
  const lines = [
    `Olá! 👋`,
    "",
    `Passando para reforçar a oportunidade do *${course.name}* na nossa unidade de *${unitLabel(course.unit)}* — Nexus Ultrassonografia.`,
    "",
  ];
  if (cls?.start_date) {
    lines.push(`📅 A próxima turma começa em *${formatDateShort(cls.start_date)}* — as vagas são limitadas.`);
    lines.push("");
  }
  lines.push("Posso tirar alguma dúvida ou te enviar mais informações? 😊");
  return lines.join("\n");
};
