import type { CourseFull, CourseModule } from "./courseHelpers";

export const isGinePostgraduate = (course: Pick<CourseFull, "mnemonic" | "name">) =>
  /^PG US GINE(?:\b|\.)/i.test(course.mnemonic ?? "") ||
  /ginecologia avançada e endometriose/i.test(course.name);

/** Overview for WhatsApp; detailed topics remain available per module in Cronograma. */
export const ginePostgraduateMessage = (
  course: CourseFull,
  modules: CourseModule[],
  year: number,
  dates: string[],
  contentOnly = false,
): string => {
  const lines = [
    `*${course.name.toUpperCase()} – NEXUS ${year}*`, "",
    "Formação em ultrassonografia ginecológica de alta complexidade, fertilidade, técnicas avançadas e diagnóstico e estadiamento da endometriose.", "",
    "📍 *Presencial, exclusivamente em Brasília.*",
    "*Coordenação:* Dra. Adriana Gualda Garrido.",
    "🕒 *Carga horária:* 360h: 100h teóricas + 200h práticas nos módulos 1–10; 20h de TCC e avaliação; 30h de orientação de TCC; 10h complementares.",
    "*Duração:* 11 meses, com encontros às quintas, sextas e sábados, o dia todo.", "",
  ];
  if (!contentOnly) lines.push("🗓️ *DATAS PREVISTAS*", ...dates, "As demais datas serão confirmadas pela secretaria acadêmica.", "");
  lines.push("📚 *CONTEÚDO PROGRAMÁTICO*", "");
  [...modules].sort((a, b) => a.order_index - b.order_index).forEach((module, i) => {
    const title = module.title.replace(/^M[óo]dulo\s*\d+\s*[:–-]\s*/i, "");
    lines.push(`*${i + 1}. ${title}*${module.workload_hours ? ` (${module.workload_hours}h)` : ""}`);
  });
  lines.push("", "*Diferenciais:* prática com pacientes de alta complexidade; tecnologias atuais; docentes especializados; discussão de casos, vídeos e cirurgias; professores internacionais convidados.",
    "*Público-alvo:* médicos interessados em ultrassonografia ginecológica avançada.",
    "🎓 *Pré-requisito:* Graduação em Medicina. Frequência mínima de 75%; TCC em formato de artigo científico obrigatório. Até 20 alunos.",
    "", "Se quiser, posso te passar os detalhes da matrícula.");
  return lines.join("\n");
};