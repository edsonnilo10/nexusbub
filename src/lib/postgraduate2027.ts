import { CourseFull, CourseModule } from "@/lib/courseHelpers";

export interface Postgraduate2027Schedule {
  coordinator: string;
  dates: string[];
  moduleCount: number;
}

const HYBRID_COURSE_KEYS = new Set(["PG US ECOF", "PG US ECOV", "PG US GINE", "PG US PEDN"]);

const HYBRID_CITY_MESSAGE =
  "Turma híbrida, com possibilidade de realização em Brasília ou em São Paulo, a depender da formação do quórum mínimo.";

const schedules: Record<string, Postgraduate2027Schedule> = {
  "PG US USGR": {
    coordinator: "A confirmar",
    dates: [],
    moduleCount: 4,
  },
  "PG US ECOF": {
    coordinator: "Jorge Afiuni",
    dates: [
      "06 A 07/08/27", "03 A 04/09/27", "01 A 02/10/27", "05 A 06/11/27",
      "03 A 04/12/27", "14 A 15/01/28", "04 A 05/02/28", "03 A 04/03/28",
      "31/03 A 01/04/28", "05 A 06/05/28",
    ],
    moduleCount: 11,
  },
  "PG US ECOV": {
    coordinator: "Peter Francolin",
    dates: [
      "20 A 22/08/27", "28 A 30/01/28", "18 A 20/02/28", "24 A 26/03/28",
      "28 A 30/04/28", "26 A 28/05/28", "23 A 25/06/28", "28/07/28",
    ],
    moduleCount: 8,
  },
  "PG US GIOB": {
    coordinator: "Gregório Acácio e Ayrton Pastore",
    dates: [
      "12 A 14/03/27", "09 A 11/04/27", "06 A 08/05/27", "11 A 13/06/27",
      "09 A 11/07/27", "13 A 15/08/27", "10 A 12/09/27", "08 A 10/10/27",
      "12 A 14/11/27", "10 A 12/12/27", "14 A 15/01/28", "04 A 05/02/28",
      "03 A 04/03/28", "31/03 A 01/04/28", "05 A 06/05/28",
    ],
    moduleCount: 16,
  },
  "PG US MEDI": {
    coordinator: "Peter Francolin",
    dates: [
      "05 A 07/03/27", "02 A 04/04/27", "30/04 A 02/05/27", "04 A 06/06/27",
      "02 A 04/07/27", "06 A 08/08/27", "03 A 05/09/27", "01 A 03/10/27",
      "05 A 07/11/27", "03 A 05/12/27", "07 A 09/01/28", "04 A 06/02/28",
    ],
    moduleCount: 12,
  },
  "PG US PEDN": {
    coordinator: "Rosemeire Garcia",
    dates: [
      "13 A 15/05/27", "18 A 20/06/27",
      "16 A 18/07/27", "20 A 22/08/27", "17 A 19/09/27", "15 A 17/10/27",
      "19 A 21/11/27", "16 A 18/12/27", "21 A 23/01/28", "18 A 20/02/28",
    ],
    moduleCount: 10,
  },
  "PG US DORM": {
    coordinator: "Erik Halex Barone dos Santos",
    dates: [
      "14 A 16/05/27", "18 A 20/06/27", "16 A 18/07/27", "20 A 22/08/27",
      "17 A 19/09/27", "15 A 17/10/27", "19 A 21/11/27", "16 A 18/12/27",
      "21 A 23/01/28", "18 A 20/02/28",
    ],
    moduleCount: 10,
  },
  "PG US NEUR": {
    coordinator: "A confirmar",
    dates: [],
    moduleCount: 24,
  },
};

/** Calendário oficial de Brasília 2027 (planilha atualizada em 06/10/2026). */
const brasiliaSchedules: Record<string, Postgraduate2027Schedule> = {
  "PG US ECOF": {
    coordinator: "Jorge Afiuni",
    dates: [
      "06 A 07/08/27", "03 A 04/09/27", "01 A 02/10/27", "05 A 06/11/27",
      "03 A 04/12/27", "14 A 15/01/28", "04 A 05/02/28", "03 A 04/03/28",
      "31/03 A 01/04/28", "05 A 06/05/28", "02/06/28",
    ],
    moduleCount: 11,
  },
  "PG US ECOV": {
    coordinator: "Peter Francolin",
    dates: [
      "20 A 22/08/27", "28 A 30/01/28", "18 A 20/02/28", "24 A 26/03/28",
      "28 A 30/04/28", "26 A 28/05/28", "23 A 25/06/28", "28/07/28",
    ],
    moduleCount: 8,
  },
  "PG US GINE": {
    coordinator: "Adriana Garrido",
    dates: ["11 A 13/03/27"],
    moduleCount: 12,
  },
  "PG US GIOB": {
    coordinator: "Adriana Garrido, Evaldo Trajano e José Paulo Netto",
    dates: [
      "05 A 07/03/27", "02 A 04/04/27", "30/04 A 02/05/27", "04 A 06/06/27",
      "01 A 04/07/27", "05 A 07/08/27", "03 A 05/09/27", "01 A 03/10/27",
      "05 A 07/11/27", "03 A 05/12/27", "14 A 16/01/28", "11/02/28",
    ],
    moduleCount: 12,
  },
  "PG US MEDI": {
    coordinator: "Peter Francolin",
    dates: [
      "09 A 11/04/27", "14 A 16/05/27", "11 A 13/06/27", "09 A 11/07/27",
      "13 A 15/08/27", "10 A 12/09/27", "08 A 10/10/27", "12 A 14/11/27",
      "10 A 12/12/27", "14 A 16/01/28", "11 A 13/02/28", "10 A 12/03/28",
      "07 A 09/04/28", "06 A 08/05/28", "09/06/28",
    ],
    moduleCount: 15,
  },
  "PG US MEFE": {
    coordinator: "Evaldo Trajano e Renato Sá",
    dates: [
      "16 A 18/04/27", "04 A 06/06/27", "30/07 A 01/08/27", "08 A 10/10/27",
      "10 A 12/12/27", "04 A 06/02/28", "07 A 09/04/28", "02/06/28",
    ],
    moduleCount: 8,
  },
  "PG US PEDN": {
    coordinator: "Rosimeire Garcia, Telma e Maria Montserrat",
    dates: [
      "13 A 15/05/27", "18 A 20/06/27", "16 A 18/07/27", "20 A 22/08/27",
      "17 A 19/09/27", "15 A 17/10/27", "19 A 21/11/27", "16 A 18/12/27",
      "21 A 23/01/28", "18 A 20/02/28",
    ],
    moduleCount: 10,
  },
  "PG US SDMU": {
    coordinator: "Adriana Garrido",
    dates: ["15 A 17/07/27"],
    moduleCount: 10,
  },
};

const nameFallbacks: Array<[string, string]> = [
  ["ultrassonografia geral", "PG US USGR"],
  ["ecocardiografia fetal", "PG US ECOF"],
  ["ecografia vascular", "PG US ECOV"],
  ["ultrassonografia vascular", "PG US ECOV"],
  ["ginecologia avançada e endometriose", "PG US GINE"],
  ["ginecologia e obstetrícia", "PG US GIOB"],
  ["medicina interna", "PG US MEDI"],
  ["pediátrica e neonatal", "PG US PEDN"],
  ["intervenção em dor", "PG US DORM"],
  ["intervenções ambulatoriais em dor", "PG US DORM"],
  ["neurossonografia fetal", "PG US NEUR"],
];

const getCourseKey = (course: Pick<CourseFull, "mnemonic" | "name">): string | null => {
  const mnemonic = course.mnemonic?.toUpperCase().replace(/\s+T\d+$/, "").trim();
  if (mnemonic) {
    const matchingKey = [...HYBRID_COURSE_KEYS, ...Object.keys(schedules), ...Object.keys(brasiliaSchedules)]
      .find((key) => mnemonic.startsWith(key));
    if (matchingKey) return matchingKey;
  }

  const normalizedName = course.name.toLowerCase();
  return nameFallbacks.find(([term]) => normalizedName.includes(term))?.[1] ?? null;
};

export const isPostgraduate2027Hybrid = (
  course: Pick<CourseFull, "mnemonic" | "name">,
): boolean => {
  const key = getCourseKey(course);
  return key ? HYBRID_COURSE_KEYS.has(key) : false;
};

export const postgraduate2027LocationMessage = (
  course: Pick<CourseFull, "mnemonic" | "name" | "unit">,
): string => {
  if (isPostgraduate2027Hybrid(course)) return HYBRID_CITY_MESSAGE;
  return course.unit === "brasilia" ? "Realização em Brasília." : "Realização em São Paulo.";
};

export const getPostgraduate2027Schedule = (
  course: Pick<CourseFull, "mnemonic" | "name" | "type"> & { unit?: CourseFull["unit"] },
): Postgraduate2027Schedule | null => {
  if (course.type !== "pos_graduacao") return null;
  const key = getCourseKey(course);
  if (!key) return null;
  if (course.unit === "brasilia") return brasiliaSchedules[key] ?? null;
  return schedules[key] ?? null;
};

export const postgraduate2027DateMessage = (
  course: Pick<CourseFull, "name" | "mnemonic" | "unit">,
  schedule: Postgraduate2027Schedule,
): string => {
  const cleanName = cleanCourseName(course.name);
  const lines = [
    `*${cleanName} 2027:*`,
    "",
    `*Formato:* ${postgraduate2027LocationMessage(course)}`,
    "",
    `*Coordenação:* ${schedule.coordinator}`,
    "",
  ];

  schedule.dates.forEach((date, index) => {
    if (!date) return;
    lines.push(`MÓDULO ${index + 1}\t${date}.`);
  });

  if (schedule.dates.length < schedule.moduleCount) {
    lines.push(
      "",
      "Nossa secretaria acadêmica irá confirmar o restante das datas em breve. Estão acertando com a coordenação.",
    );
  }

  return lines.join("\n");
};

const cleanCourseName = (name: string): string =>
  name.replace(/^PG\s+US\s+\w+(?:\s+T\d+)?\s*[:–-]?\s*/i, "").trim();

const formatWorkload = (course: Pick<CourseFull, "workload_hours" | "workload_breakdown">): string => {
  const base = course.workload_hours ? `${course.workload_hours}h` : "Carga horária a confirmar";
  return course.workload_breakdown ? `${base} — ${course.workload_breakdown}` : base;
};

const datesLines = (schedule: Postgraduate2027Schedule): string[] =>
  schedule.dates.flatMap((date, index) => (date ? [`MÓDULO ${index + 1}\t${date}.`] : []));

export const postgraduate2027FullMessage = (
  course: CourseFull,
  modules: CourseModule[],
  schedule: Postgraduate2027Schedule,
): string => {
  const cleanName = cleanCourseName(course.name);
  const lines: string[] = [`*${cleanName.toUpperCase()} – NEXUS 2027*`, ""];

  if (course.description) {
    lines.push(`_${course.description.split(/(?<=[.!?])\s/)[0]}_`, "");
  }

  lines.push(`🕒 *Carga Horária:* ${formatWorkload(course)}`);
  lines.push(`📍 *Formato:* ${postgraduate2027LocationMessage(course)}`);
  lines.push(`*Coordenação:* ${schedule.coordinator}`, "");
  lines.push(`🗓️ *DATAS JÁ PREVISTAS*`, "", ...datesLines(schedule), "");
  if (schedule.dates.length < schedule.moduleCount) {
    lines.push("Nossa secretaria acadêmica irá confirmar o restante das datas em breve. Estão acertando com a coordenação.", "");
  }

  if (modules.length > 0) {
    lines.push(`*O QUE VOCÊ VAI DOMINAR*`, "");
    [...modules]
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((module) => {
        const workload = module.workload_hours ? ` _(${module.workload_hours}h)_` : "";
        lines.push(`▪️ *${module.title}*${workload}`);
        if (module.description) lines.push(module.description.trim());
      });
    lines.push("");
  }

  lines.push(`🎓 *Pré-Requisito:* Graduação em Medicina.`);
  lines.push("Se quiser, posso te passar os detalhes da matrícula.");

  return lines.join("\n");
};

export const postgraduate2027FollowUpMessage = (
  course: Pick<CourseFull, "name" | "mnemonic" | "unit" | "workload_hours" | "workload_breakdown">,
  schedule: Postgraduate2027Schedule,
): string => {
  const cleanName = cleanCourseName(course.name);
  const lines = [
    "Olá! 👋",
    "",
    `Passando para te enviar as informações da turma 2027 da *${cleanName}* na Escola NEXUS.`,
    "",
    `🕒 *Carga Horária:* ${formatWorkload(course)}`,
    `📍 *Formato:* ${postgraduate2027LocationMessage(course)}`,
    `*Coordenação:* ${schedule.coordinator}`,
    "",
    `🗓️ *Datas já previstas:*`,
    ...datesLines(schedule),
    "",
  ];

  if (schedule.dates.length < schedule.moduleCount) {
    lines.push("Nossa secretaria acadêmica irá confirmar o restante das datas em breve. Estão acertando com a coordenação.", "");
  }
  lines.push("Posso tirar alguma dúvida sobre a turma? 😊");

  return lines.join("\n");
};

export const postgraduate2027ContentMessage = (
  course: CourseFull,
  modules: CourseModule[],
): string => {
  const cleanName = cleanCourseName(course.name);
  const lines: string[] = [
    "📚 *CONTEÚDO PROGRAMÁTICO*",
    `*${cleanName.toUpperCase()} – NEXUS 2027*`,
    "",
    "Conforme solicitado, segue o *conteúdo programático completo* da nossa pós-graduação 👇",
    "",
    `🕒 *Carga horária total:* ${formatWorkload(course)}`,
    `📍 *Formato:* ${postgraduate2027LocationMessage(course)}`,
    "",
  ];

  if (modules.length === 0) {
    lines.push("_Conteúdo programático em fase de atualização. Posso te enviar assim que estiver disponível._");
  } else {
    [...modules]
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((module, index) => {
        const workload = module.workload_hours ? ` _(${module.workload_hours}h)_` : "";
        lines.push(`*${index + 1}. ${module.title}*${workload}`);
        if (module.description) {
          module.description
            .split(/\n+|;/)
            .map((topic) => topic.trim())
            .filter(Boolean)
            .forEach((topic) => lines.push(`   • ${topic.replace(/^[-•·▪️*]+\s*/, "")}`));
        }
        lines.push("");
      });
  }

  lines.push(`🎓 *Pré-Requisito:* Graduação em Medicina.`);
  lines.push("Qualquer dúvida sobre algum módulo específico, é só me chamar! 😊");

  return lines.join("\n");
};

export const postgraduate2027InvestmentMessage = (course: CourseFull): string => {
  const cleanName = cleanCourseName(course.name);
  return [
    `*${cleanName.toUpperCase()} – NEXUS 2027*`,
    `🕒 *Carga Horária:* ${formatWorkload(course)}`,
    `📍 *Formato:* ${postgraduate2027LocationMessage(course)}`,
    "",
    "💰 *INVESTIMENTO*",
    "",
    "✔️ *Valor 2027:* R$ _________",
    "",
    "✔️ *Valor com desconto e parcelamento:*",
    "( ) R$ _________ em ___x de R$ _________",
  ].join("\n");
};
