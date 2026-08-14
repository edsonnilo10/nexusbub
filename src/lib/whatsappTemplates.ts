import {
  CourseFull, CourseModule, CourseClass, ClassStatus,
  formatBRL, unitLabel, formatClassDateRange, classStatusLabel,
} from "./courseHelpers";

const parseDate = (date: string | null | undefined): Date | null => {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

const classKey = (cls: CourseClass): string => [
  cls.start_date || "",
  cls.end_date || "",
  cls.status,
  cls.location || "",
].join("|");

const dedupeClasses = (classes: CourseClass[]): CourseClass[] => {
  const seen = new Set<string>();
  return classes.filter((cls) => {
    const key = classKey(cls);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortClasses = (classes: CourseClass[]): CourseClass[] => {
  return [...classes].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
};

const upcomingClasses = (classes: CourseClass[]): CourseClass[] => {
  const today = new Date().toISOString().slice(0, 10);
  return sortClasses(
    dedupeClasses(classes).filter((c) => c.start_date && c.status !== "encerrada" && c.start_date >= today),
  );
};

const allFutureOrCurrent = (classes: CourseClass[]): CourseClass[] => {
  const today = new Date().toISOString().slice(0, 10);
  return sortClasses(
    dedupeClasses(classes).filter(
      (c) => c.status !== "encerrada" && (!c.end_date || c.end_date >= today) && (!c.start_date || c.start_date >= today || c.status === "atual"),
    ),
  );
};

const nextClass = (classes: CourseClass[]): CourseClass | null => {
  const ordered = sortClasses(dedupeClasses(classes));
  return ordered.find((c) => c.status === "atual") ||
         ordered.find((c) => c.status === "proxima") ||
         ordered.find((c) => c.status === "aguardando_confirmacao") ||
         ordered[0] || null;
};

/** Resolve qual turma usar: a explicitamente selecionada (se presente nas classes) ou o próximo padrão */
const resolveClass = (classes: CourseClass[], selected?: CourseClass | null): CourseClass | null => {
  if (selected) {
    const found = classes.find((c) => c.id === selected.id);
    if (found) return found;
    return selected;
  }
  return nextClass(classes);
};

/** Ano de referência: pega da turma selecionada/próxima; se não houver, garante mínimo 2026 */
const referenceYear = (classes: CourseClass[], selected?: CourseClass | null): number => {
  const cls = resolveClass(classes, selected);
  const fromClass = parseDate(cls?.start_date)?.getFullYear();
  if (fromClass) return fromClass;
  return Math.max(2026, new Date().getFullYear());
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

/** Exibe a carga horária de forma sucinta, incluindo divisão teórica/prática quando disponível */
const formatWorkload = (course: CourseFull): string => {
  const base = course.workload_hours ? `${course.workload_hours}h` : "Carga horária a confirmar";
  if (course.workload_breakdown) {
    return `${base} — ${course.workload_breakdown}`;
  }
  return base;
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

/** Bloco curto destacando a turma selecionada (data + status + local) */
const selectedClassBlock = (course: CourseFull, cls: CourseClass | null): string => {
  if (!cls || !cls.start_date) return "";
  const range = formatClassDateRange(cls.start_date, cls.end_date);
  const lines: string[] = [];
  lines.push(`🗓️ *Turma indicada:* ${range}`);
  lines.push(`${statusEmoji(cls.status)} _${classStatusLabel(cls.status)}_`);
  lines.push(`📍 ${locationFor(course, cls)}`);
  return lines.join("\n");
};

/** Mensagem completa no padrão Nexus */
export const fullMessage = (
  course: CourseFull,
  modules: CourseModule[],
  classes: CourseClass[],
  selectedClass?: CourseClass | null,
): string => {
  const cls = resolveClass(classes, selectedClass);
  const year = referenceYear(classes, selectedClass);
  const lines: string[] = [];

  lines.push(`*${course.name.toUpperCase()} – NEXUS ${year}*`);
  lines.push("");

  if (course.description) {
    const firstSentence = course.description.split(/(?<=[.!?])\s/)[0];
    lines.push(`_${firstSentence}_`);
    lines.push("");
  }

  const wl = formatWorkload(course);
  lines.push(
    `A Escola NEXUS apresenta uma imersão de *${wl}* projetada para transformar sua atuação clínica, unindo embasamento teórico robusto a uma carga prática intensiva com pacientes reais.`
  );
  lines.push("");

  // Se há turma selecionada, mostra SOMENTE ela. Caso contrário, lista todas as próximas.
  if (selectedClass && cls) {
    const block = selectedClassBlock(course, cls);
    if (block) {
      lines.push(block);
      lines.push("");
    }
  } else {
    lines.push(classesBlock(classes));
    lines.push("");
  }

  // Local padrão (somente quando não há turma selecionada — senão já vem no bloco acima)
  if (!selectedClass) {
    lines.push(`📍 *Local:* ${locationFor(course, cls)}`);
    lines.push("");
  }

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
export const shortMessage = (
  course: CourseFull,
  classes: CourseClass[],
  selectedClass?: CourseClass | null,
): string => {
  const cls = resolveClass(classes, selectedClass);
  const year = referenceYear(classes, selectedClass);
  const lines: string[] = [];

  lines.push(`*${course.name.toUpperCase()} – NEXUS ${year}*`);
  lines.push("");

  if (course.description) {
    const firstSentence = course.description.split(/(?<=[.!?])\s/)[0];
    lines.push(`_${firstSentence}_`);
    lines.push("");
  }

  // Se uma turma foi selecionada, destaca ela
  if (selectedClass && cls?.start_date) {
    lines.push(`🗓️ *Turma indicada:* ${formatClassDateRange(cls.start_date, cls.end_date)}`);
    lines.push(`${statusEmoji(cls.status)} _${classStatusLabel(cls.status)}_`);
    lines.push("");
  } else {
    // Apenas as próximas (sem encerradas)
    const upcoming = upcomingClasses(classes);
    if (upcoming.length > 0) {
      lines.push("🗓️ *Próximas turmas:*");
      upcoming.slice(0, 3).forEach((c) => {
        lines.push(`${statusEmoji(c.status)} ${formatClassDateRange(c.start_date, c.end_date)} _(${classStatusLabel(c.status)})_`);
      });
      lines.push("");
    }
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
export const followUpMessage = (
  course: CourseFull,
  classes: CourseClass[],
  selectedClass?: CourseClass | null,
): string => {
  const cls = resolveClass(classes, selectedClass);
  const range = cls?.start_date ? formatClassDateRange(cls.start_date, cls.end_date) : null;
  const lines = [
    `Olá! 👋`,
    "",
    `Passando para reforçar a oportunidade do *${course.name}* na *Escola NEXUS de Ultrassonografia – ${unitLabel(course.unit)}*.`,
    "",
  ];
  if (range && cls) {
    const label = selectedClass ? "Turma indicada" : "Próxima turma";
    lines.push(`🗓️ *${label}:* ${range}`);
    lines.push(`${statusEmoji(cls.status)} _${classStatusLabel(cls.status)}_`);
    lines.push(`📍 ${locationFor(course, cls)}`);
    lines.push("");
  }
  lines.push(`Posso tirar alguma dúvida ou te enviar o conteúdo programático completo? 😊`);
  return lines.join("\n");
};

/** Conteúdo programático detalhado por módulo (ideal para pós-graduações) */
export const programaticContentMessage = (
  course: CourseFull,
  modules: CourseModule[],
  classes: CourseClass[],
  selectedClass?: CourseClass | null,
): string => {
  const cls = resolveClass(classes, selectedClass);
  const year = referenceYear(classes, selectedClass);
  const isPos = course.type === "pos_graduacao";
  const lines: string[] = [];

  lines.push(`📚 *CONTEÚDO PROGRAMÁTICO*`);
  lines.push(`*${course.name.toUpperCase()} – NEXUS ${year}*`);
  lines.push("");

  if (isPos) {
    lines.push(`Conforme solicitado, segue o *conteúdo programático completo* da nossa pós-graduação 👇`);
  } else {
    lines.push(`Segue o *conteúdo programático completo* do curso 👇`);
  }
  lines.push("");

  if (course.workload_hours) {
    lines.push(`🕒 *Carga horária total:* ${course.workload_hours} horas`);
  }
  // Mostra turma APENAS se foi explicitamente selecionada
  if (selectedClass && cls?.start_date) {
    lines.push(`🗓️ *Turma indicada:* ${formatClassDateRange(cls.start_date, cls.end_date)}`);
    lines.push(`📍 ${locationFor(course, cls)}`);
  }
  lines.push("");

  if (modules.length === 0) {
    lines.push(`_Conteúdo programático em fase de atualização. Posso te enviar assim que estiver disponível._`);
  } else {
    const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
    sorted.forEach((m, idx) => {
      const wlm = m.workload_hours ? ` _(${m.workload_hours}h)_` : "";
      lines.push(`*${idx + 1}. ${m.title}*${wlm}`);
      if (m.description) {
        const topics = m.description
          .split(/\n+|;/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        topics.forEach((t) => lines.push(`   • ${t.replace(/^[-•·▪️*]+\s*/, "")}`));
      }
      lines.push("");
    });
  }

  if (isPos) {
    lines.push(`🎓 *Pré-Requisito:* Graduação em Medicina.`);
    lines.push("");
    lines.push(`Qualquer dúvida sobre algum módulo específico, é só me chamar! 😊`);
  } else {
    lines.push(`Qualquer dúvida sobre o conteúdo, é só me chamar! 😊`);
  }

  return lines.join("\n");
};

/** Mensagem de Investimento — valores em aberto, prontos para preencher */
export const investmentMessage = (
  course: CourseFull,
  classes: CourseClass[],
  selectedClass?: CourseClass | null,
): string => {
  const year = referenceYear(classes, selectedClass);
  const wl = course.workload_hours ? `${course.workload_hours} horas` : "Carga horária a confirmar";
  const lines: string[] = [];

  lines.push(`*${course.name.toUpperCase()} – NEXUS ${year}*`);
  lines.push(`🕒 *Carga Horária:* ${wl}`);
  lines.push("");
  lines.push(`💰 *INVESTIMENTO*`);
  lines.push("");
  lines.push(`✔️ *Valor ${year}:* R$ _________`);
  lines.push("");
  lines.push(`✔️ *Valor com desconto e parcelamento:*`);
  lines.push(`( ) R$ _________ em ___x de R$ _________`);

  return lines.join("\n");
};

