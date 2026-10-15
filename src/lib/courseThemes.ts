import { CourseFull } from "@/lib/courseHelpers";

export interface CourseTheme { id: string; label: string; keys: string[]; words: string[] }

/** Temas derivados da base de cursos Nexus (mnemônicos e nomes). Um curso pode estar em mais de um tema. */
export const COURSE_THEMES: CourseTheme[] = [
  { id: "ginecologia", label: "Ginecologia", keys: ["GIOB", "TRVG", "TRVA", "TRVM", "GTVG", "COLP", "HYCY", "ENPO", "ENDA", "URGI", "DOGO", "GINE", "GERE", "FEOG", "POGO"], words: ["ginecolog", "transvaginal", "endometriose", "colposcopia", "uroginecolog"] },
  { id: "obstetricia", label: "Obstetrícia", keys: ["GIOB", "GTVG", "DAPO", "DOGO", "MOR1", "MOR2", "MORF", "SLPA", "FEOG", "POGO"], words: ["obstetr", "morfológica", "sala de parto"] },
  { id: "medicina-fetal", label: "Medicina Fetal", keys: ["MEFE", "MIFE", "MIFP", "GENE", "ECOF", "NEUR", "MOR1", "MOR2", "MORF", "DAPO"], words: ["fetal", "morfológica"] },
  { id: "saude-mulher", label: "Saúde da Mulher", keys: ["SDMU", "MAMA", "GINE", "GERE", "ENPO", "ENDA", "HYCY", "COLP", "URGI", "GIOB", "TRVG", "TRVA"], words: ["mulher", "mama", "mamária"] },
  { id: "mama", label: "Mama", keys: ["MAMA"], words: ["mama", "mamária"] },
  { id: "medicina-interna", label: "Medicina Interna e Abdome", keys: ["MEDI", "PTMI", "DPMI", "PARI", "QMPF", "ELAG", "URO1", "USGR", "GERAL"], words: ["medicina interna", "abdominal", "fígado", "hepática", "urológica", "geral"] },
  { id: "tireoide", label: "Tireoide e Cervical", keys: ["TIRD", "PUCT"], words: ["tireoide", "cervical"] },
  { id: "vascular", label: "Vascular e Doppler", keys: ["CAVF", "CAVE", "VAMI", "PUVA", "ECOV", "DPMI", "DOGO"], words: ["vascular", "doppler", "artérias", "venoso"] },
  { id: "cardio", label: "Ecocardiografia", keys: ["ECOA", "MECA", "STRA", "ECOF", "NEO2"], words: ["ecocardi", "strain", "cardíaco"] },
  { id: "pediatria", label: "Pediatria e Neonatologia", keys: ["PED1", "PED2", "PED3", "NEON", "NEO2", "PONE", "PEDN"], words: ["pediátric", "pediatria", "neonat", "transfontanelar"] },
  { id: "musculo", label: "Musculoesquelético e Dor", keys: ["MESQ", "INME", "ICOC", "MEIN", "DORM", "MEDO"], words: ["musculoesquelét", "infiltraç", "dor"] },
  { id: "urgencia", label: "Urgência e POCUS", keys: ["POCA", "POCE", "POGO", "PUVA"], words: ["point of care", "point-of-care", "pocus", "urgência"] },
  { id: "procedimentos", label: "Procedimentos e Punções", keys: ["BIPT", "MAMA", "PUCT", "PUVA", "PTMI", "PONE", "INME", "ICOC"], words: ["punção", "biópsia", "procediment"] },
];

const keyOf = (c: Pick<CourseFull, "mnemonic" | "name">) => {
  const src = (c.mnemonic || c.name || "").toUpperCase();
  const m = src.match(/\b(?:CM|PG)\s+[A-Z]{2}\s+([A-Z0-9]{3,5})/);
  return m?.[1] ?? "";
};

export const courseThemeIds = (c: Pick<CourseFull, "mnemonic" | "name">): string[] => {
  const k = keyOf(c);
  const n = (c.name || "").toLowerCase();
  const ids = COURSE_THEMES.filter((t) => (k && t.keys.includes(k)) || t.words.some((w) => n.includes(w))).map((t) => t.id);
  return ids.length ? ids : ["outros"];
};
