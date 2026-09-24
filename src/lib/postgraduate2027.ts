import { CourseFull } from "@/lib/courseHelpers";

export interface Postgraduate2027Schedule {
  coordinator: string;
  dates: string[];
  moduleCount: number;
}

const schedules: Record<string, Postgraduate2027Schedule> = {
  "PG US ECOF": {
    coordinator: "Jorge Afiuni",
    dates: ["06 A 07/08/27", "03 A 04/09/27", "01 A 02/10/27", "05 A 06/11/27"],
    moduleCount: 10,
  },
  "PG US ECOV": {
    coordinator: "Peter Francolin",
    dates: ["20 A 22/08/27", "24 A 26/09/27", "29 A 31/10/27", "19 A 21/11/27"],
    moduleCount: 13,
  },
  "PG US GIOB": {
    coordinator: "Gregório Acácio e Ayrton Pastore",
    dates: [
      "12 A 14/03/27", "09 A 11/04/27", "06 A 08/05/27", "11 A 13/06/27",
      "09 A 11/07/27", "13 A 15/08/27", "10 A 12/09/27", "08 A 10/10/27",
      "12 A 14/11/27",
    ],
    moduleCount: 13,
  },
  "PG US MEDI": {
    coordinator: "Peter Francolin",
    dates: [
      "05 A 07/03/27", "02 A 04/04/27", "30/04 A 02/05/27", "04 A 06/06/27",
      "02 A 04/07/27", "06 A 08/08/27", "03 A 05/09/27", "01 A 03/10/27",
      "05 A 07/11/27 (A CONFIRMAR)", "03 A 05/12/27 (A CONFIRMAR)",
    ],
    moduleCount: 15,
  },
  "PG US PEDN": {
    coordinator: "Rosemeire Garcia",
    dates: [
      "19 A 21/03/27", "16 A 18/04/27", "13 A 15/05/27", "18 A 20/06/27",
      "16 A 18/07/27", "20 A 22/08/27", "17 A 19/09/27", "15 A 17/10/27",
      "21/11 A 16/12/27",
    ],
    moduleCount: 10,
  },
  "PG US DORM": {
    coordinator: "Felipe Carneiro e Erick Baroni",
    dates: [
      "05 A 07/03/27", "02 A 04/04/27", "30/04 A 02/05/27", "04 A 06/06/27",
      "02 A 04/07/27", "06 A 08/08/27", "03 A 05/09/27", "01 A 03/10/27",
      "05 A 07/11/27 (A CONFIRMAR)", "03 A 05/12/27 (A CONFIRMAR)",
    ],
    moduleCount: 10,
  },
};

const nameFallbacks: Array<[string, string]> = [
  ["ecocardiografia fetal", "PG US ECOF"],
  ["ecografia vascular", "PG US ECOV"],
  ["ultrassonografia vascular", "PG US ECOV"],
  ["ginecologia e obstetrícia", "PG US GIOB"],
  ["medicina interna", "PG US MEDI"],
  ["pediátrica e neonatal", "PG US PEDN"],
  ["intervenção em dor", "PG US DORM"],
];

export const getPostgraduate2027Schedule = (
  course: Pick<CourseFull, "mnemonic" | "name" | "type">,
): Postgraduate2027Schedule | null => {
  if (course.type !== "pos_graduacao") return null;
  const mnemonic = course.mnemonic?.toUpperCase().replace(/\s+T\d+$/, "").trim();
  if (mnemonic && schedules[mnemonic]) return schedules[mnemonic];

  const normalizedName = course.name.toLowerCase();
  const match = nameFallbacks.find(([term]) => normalizedName.includes(term));
  return match ? schedules[match[1]] : null;
};

export const postgraduate2027DateMessage = (
  course: Pick<CourseFull, "name">,
  schedule: Postgraduate2027Schedule,
): string => {
  const cleanName = course.name.replace(/^PG\s+US\s+\w+(?:\s+T\d+)?\s*[:–-]?\s*/i, "").trim();
  const lines = [
    `*${cleanName} 2027:*`,
    "",
    `*Coordenação:* ${schedule.coordinator}`,
    "",
  ];

  for (let index = 0; index < schedule.moduleCount; index += 1) {
    const date = schedule.dates[index] ?? "A DECIDIR";
    lines.push(`MÓDULO ${index + 1}\t${date}.`);
  }

  lines.push(
    "",
    "Nossa secretaria acadêmica irá confirmar o restante das datas em breve. Estão acertando com a coordenação.",
  );

  return lines.join("\n");
};
