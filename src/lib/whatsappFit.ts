import type { CourseModule } from "@/lib/courseHelpers";

export const WHATSAPP_LIMIT = 4095;

const topicsOf = (description: string): string[] =>
  description
    .split(/\n+|;\s*|(?<=\.)\s+/)
    .map((t) => t.replace(/^[-•·*▪️\s]+/, "").replace(/[.;,\s]+$/, "").trim())
    .filter(Boolean);

/** Resumo de um módulo com no máximo `maxChars`, sempre terminando em tópico completo (sem reticências). */
const summarize = (description: string, maxChars: number): string => {
  const topics = topicsOf(description);
  let out = "";
  for (const topic of topics) {
    const next = out ? `${out}; ${topic}` : topic;
    if (next.length + 1 > maxChars) break;
    out = next;
  }
  return out ? `${out}.` : "";
};

/**
 * Monta a mensagem com módulos que cabem em 4.095 caracteres, preservando cabeçalho e encerramento.
 * Reduz progressivamente os temas de cada módulo; em último caso lista apenas os títulos.
 */
export const fitModulesMessage = (
  head: string[],
  modules: CourseModule[],
  tail: string[],
  formatTitle: (module: CourseModule, index: number) => string,
  limit = WHATSAPP_LIMIT,
): string => {
  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
  const build = (maxDesc: number | null) => {
    const body: string[] = [];
    sorted.forEach((m, i) => {
      body.push(formatTitle(m, i));
      if (m.description && maxDesc !== 0) {
        const d = maxDesc === null ? m.description.trim() : summarize(m.description, maxDesc);
        if (d) body.push(d);
      }
    });
    return [...head, ...body, ...(sorted.length ? [""] : []), ...tail].join("\n");
  };

  let text = build(null);
  if (text.length <= limit) return text;
  for (const max of [400, 300, 220, 160, 110, 70]) {
    text = build(max);
    if (text.length <= limit) return text;
  }
  return build(0);
};
