// Pure helpers for the admin-only "system health" check.
// Kept free of Supabase so the rules can be unit-tested.

export const WHATSAPP_LIMIT = 4095;

export type HealthStatus = "ok" | "warn" | "fail";

export interface HealthResult {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
}

export interface CourseLite {
  id: string;
  name: string;
  unit: string;
}

export interface ClassLink {
  course_id: string;
  start_date: string;
  end_date: string | null;
}

export interface OverrideRow {
  course_id: string;
  wa_short?: string | null;
  wa_full?: string | null;
  wa_followup?: string | null;
  wa_investment?: string | null;
  wa_2027?: Record<string, string> | null;
}

export interface HealthInput {
  /** Message from the first probe query, or null when the server answered. */
  connectionError: string | null;
  isAdmin: boolean;
  pendingApprovals: number;
  auditReadable: boolean;
  /** HTTP status of the confirmation e-mail function probe, or "unreachable". */
  emailFunction: number | "unreachable";
  courses: CourseLite[];
  classLinks: ClassLink[];
  groupIds: string[];
  linkedGroupIds: string[];
  overrides: OverrideRow[];
  moduleCounts: Record<string, number>;
  /** Today as YYYY-MM-DD. */
  today: string;
}

const UNIT_LABEL: Record<string, string> = {
  sao_paulo: "São Paulo",
  brasilia: "Brasília",
};

const nameOf = (courses: CourseLite[], id: string) => {
  const found = courses.find((c) => c.id === id);
  return found ? found.name : id;
};

const listNames = (names: string[], max = 5) => {
  const shown = names.slice(0, max).join("; ");
  return names.length > max ? `${shown}; e mais ${names.length - max}` : shown;
};

const longMessages = (row: OverrideRow): string[] => {
  const out: string[] = [];
  const texts = [
    ["resumida", row.wa_short],
    ["completa", row.wa_full],
    ["follow-up", row.wa_followup],
    ["investimento", row.wa_investment],
  ] as const;
  for (const [label, text] of texts) {
    if (typeof text === "string" && text.length > WHATSAPP_LIMIT) out.push(label);
  }
  if (row.wa_2027 && typeof row.wa_2027 === "object") {
    for (const [key, text] of Object.entries(row.wa_2027)) {
      if (typeof text === "string" && text.length > WHATSAPP_LIMIT) out.push(`2027 ${key}`);
    }
  }
  return out;
};

export const evaluateSystemHealth = (input: HealthInput): HealthResult[] => {
  const results: HealthResult[] = [];

  // 1) Server reachable
  results.push(
    input.connectionError
      ? {
          id: "connection",
          label: "Conexão com o servidor",
          status: "fail",
          detail: `O servidor não respondeu: ${input.connectionError}`,
        }
      : {
          id: "connection",
          label: "Conexão com o servidor",
          status: "ok",
          detail: "O servidor respondeu normalmente.",
        },
  );

  // 2) Your admin access
  results.push(
    input.isAdmin
      ? {
          id: "admin",
          label: "Seu acesso de administrador",
          status: "ok",
          detail: "Seu perfil consta como administrador.",
        }
      : {
          id: "admin",
          label: "Seu acesso de administrador",
          status: "fail",
          detail: "Seu perfil não consta como administrador.",
        },
  );

  // 3) Approval queue + history
  results.push({
    id: "approvals",
    label: "Fila de aprovações",
    status: input.auditReadable ? "ok" : "warn",
    detail: input.auditReadable
      ? `${input.pendingApprovals} ${input.pendingApprovals === 1 ? "cadastro aguardando" : "cadastros aguardando"} aprovação. Histórico de aprovações acessível.`
      : "Não foi possível ler o histórico de aprovações.",
  });

  // 4) Confirmation e-mail function
  const email = input.emailFunction;
  results.push(
    email === 400
      ? {
          id: "email",
          label: "E-mail de confirmação",
          status: "ok",
          detail: "O serviço que confirma o e-mail do aluno está no ar e autoriza você.",
        }
      : email === 401 || email === 403
        ? {
            id: "email",
            label: "E-mail de confirmação",
            status: "fail",
            detail: "O serviço recusou seu acesso (sem autorização).",
          }
        : email === "unreachable"
          ? {
              id: "email",
              label: "E-mail de confirmação",
              status: "fail",
              detail: "O serviço de confirmação de e-mail não respondeu.",
            }
          : {
              id: "email",
              label: "E-mail de confirmação",
              status: "warn",
              detail: `O serviço respondeu com o código ${email}; confirme o envio de um e-mail real.`,
            },
  );

  // 5) Courses in both cities
  const perUnit = new Map<string, number>();
  for (const course of input.courses) {
    perUnit.set(course.unit, (perUnit.get(course.unit) || 0) + 1);
  }
  const missingUnits = Object.keys(UNIT_LABEL).filter((u) => !(perUnit.get(u) || 0));
  const unitText = Object.keys(UNIT_LABEL)
    .map((u) => `${UNIT_LABEL[u]}: ${perUnit.get(u) || 0}`)
    .join(" · ");
  results.push(
    missingUnits.length
      ? {
          id: "courses",
          label: "Cursos cadastrados",
          status: "fail",
          detail: `Nenhum curso em ${missingUnits.map((u) => UNIT_LABEL[u]).join(" e ")}. ${unitText}.`,
        }
      : {
          id: "courses",
          label: "Cursos cadastrados",
          status: "ok",
          detail: `${input.courses.length} cursos. ${unitText}.`,
        },
  );

  // 6) Calendar dates. Links without a start date are placeholders ("a decidir")
  // and are reported by the links check instead, so they never count as repeats.
  const dated = input.classLinks.filter((l) => !!l.start_date);
  const seen = new Map<string, number>();
  let inverted = 0;
  let past = 0;
  for (const link of dated) {
    if (link.end_date && link.end_date < link.start_date) inverted += 1;
    const last = link.end_date || link.start_date;
    if (last && last < input.today) past += 1;
    const key = `${link.course_id}|${link.start_date}|${link.end_date || ""}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicates = [...seen.values()].filter((n) => n > 1).length;
  const dateDetails: string[] = [];
  if (inverted) dateDetails.push(`${inverted} período(s) com fim antes do início`);
  if (duplicates) dateDetails.push(`${duplicates} data(s) repetida(s)`);
  if (past) dateDetails.push(`${past} data(s) já passada(s)`);
  results.push(
    inverted || duplicates
      ? {
          id: "dates",
          label: "Datas do calendário",
          status: "fail",
          detail: `${dateDetails.join("; ")}.`,
        }
      : past
        ? {
            id: "dates",
            label: "Datas do calendário",
            status: "warn",
            detail: `${past} data(s) já passou(s) e ainda aparece(m) no sistema.`,
          }
        : {
            id: "dates",
            label: "Datas do calendário",
            status: "ok",
            detail: `${dated.length} datas no calendário, todas corretas e futuras.`,
          },
  );

  // 7) WhatsApp messages within the limit
  const tooLong = input.overrides
    .map((row) => ({ course: nameOf(input.courses, row.course_id), fields: longMessages(row) }))
    .filter((row) => row.fields.length);
  results.push(
    tooLong.length
      ? {
          id: "messages",
          label: "Mensagens do WhatsApp",
          status: "fail",
          detail: `${tooLong.length} mensagem(ns) acima de ${WHATSAPP_LIMIT.toLocaleString("pt-BR")} caracteres: ${listNames(tooLong.map((t) => `${t.course} (${t.fields.join(", ")})`))}.`,
        }
      : {
          id: "messages",
          label: "Mensagens do WhatsApp",
          status: "ok",
          detail: `Todas as ${input.overrides.length} mensagens salvas cabem no limite de ${WHATSAPP_LIMIT.toLocaleString("pt-BR")} caracteres.`,
        },
  );

  // 8) Modules per course
  const withoutModules = input.courses.filter((c) => !(input.moduleCounts[c.id] > 0));
  results.push(
    withoutModules.length
      ? {
          id: "modules",
          label: "Conteúdo dos cursos",
          status: "warn",
          detail: `${withoutModules.length} curso(s) sem módulos cadastrados: ${listNames(withoutModules.map((c) => c.name))}.`,
        }
      : {
          id: "modules",
          label: "Conteúdo dos cursos",
          status: "ok",
          detail: "Todos os cursos têm módulos cadastrados.",
        },
  );

  // 9) Courses without dates, groups without courses
  const linkedCourses = new Set(input.classLinks.map((l) => l.course_id));
  const coursesWithoutDates = input.courses.filter((c) => !linkedCourses.has(c.id));
  const linkedGroups = new Set(input.linkedGroupIds);
  const emptyGroups = input.groupIds.filter((g) => !linkedGroups.has(g));
  const linkParts: string[] = [];
  if (coursesWithoutDates.length) {
    linkParts.push(`${coursesWithoutDates.length} curso(s) sem data: ${listNames(coursesWithoutDates.map((c) => c.name))}`);
  }
  if (emptyGroups.length) {
    linkParts.push(`${emptyGroups.length} turma(s) sem curso vinculado`);
  }
  results.push(
    linkParts.length
      ? {
          id: "links",
          label: "Cursos e turmas vinculados",
          status: "warn",
          detail: `${linkParts.join(". ")}.`,
        }
      : {
          id: "links",
          label: "Cursos e turmas vinculados",
          status: "ok",
          detail: "Todos os cursos têm data e todas as turmas têm curso vinculado.",
        },
  );

  return results;
};

export const summarizeHealth = (results: HealthResult[]) => {
  const ok = results.filter((r) => r.status === "ok").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const fail = results.filter((r) => r.status === "fail").length;
  return { ok, warn, fail, total: results.length };
};
