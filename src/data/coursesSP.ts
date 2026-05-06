// ============================================================
//  coursesSP.ts — Nexus Ultrassonografia
//  Lookup bidirecional: código <-> nome (aba SP)
//  Sem alucinação: retorna null se não encontrar
// ============================================================

export interface Course {
  code: string; // ex: "CM US MAMA.SP"
  name: string; // ex: "Ultrassonografia Mamária Diagnóstica"
  tab: "SP";
}

// ─── Catálogo completo da aba SP ─────────────────────────────
export const COURSES_SP: Course[] = [
  { code: "CM US MAMA.SP", name: "Ultrassonografia Mamária Diagnóstica", tab: "SP" },
  { code: "CM PT MAMA.SP", name: "Biópsia de Mama", tab: "SP" },
  { code: "CM US MOR1.SP", name: "Ultrassonografia Morfológica 1º trimestre", tab: "SP" },
  { code: "CM US MOR2.SP", name: "Ultrassonografia Morfológica 2º trimestre", tab: "SP" },
  { code: "CM US PED1.SP", name: "Ultrassonografia do Abdomem Pediátrico e Pelve", tab: "SP" },
  { code: "CM US PED2.SP", name: "Ultrassonografia Transfontanelar", tab: "SP" },
  { code: "CM US MEDI.SP", name: "Básico de Ultrassonografia Medicina Interna", tab: "SP" },
  { code: "CM PT PTMI.SP", name: "Prática Intensiva em Medicina Interna", tab: "SP" },
  { code: "CM US MESQ.SP", name: "Ultrassonografia do Musculoesquelético", tab: "SP" },
  { code: "CM US INME.SP", name: "Hands-on de Infiltração articulares e miotendíneas guiadas por Ultrassonografia", tab: "SP" },
  { code: "CM US QMPF.SP", name: "Avaliação Multiparamétrica do Fígado", tab: "SP" },
  { code: "CM US TIRD.SP", name: "Ultrassonografia em Tireoide com Doppler, Cervical e Glândulas salivares", tab: "SP" },
  { code: "CM PT PUCT.SP", name: "Técnica de punção de tireoide, parótidas e linfonodos: minimizando a recoleta e aumentando a produtividade", tab: "SP" },
  { code: "CM US GIOB.SP", name: "Básico de US em Ginecologia e Obstetrícia", tab: "SP" },
  { code: "CM US TRVG.SP", name: "Ultrassonografia Transvaginal", tab: "SP" },
  { code: "CM US ENPO.SP", name: "Endometriose profunda", tab: "SP" },
  { code: "CM PR MIFE.SP", name: "Revisão interativa em Medicina Fetal e preparatório para a prova de título da FEBRASGO", tab: "SP" },
  { code: "CM US CAVF.SP", name: "Ultrassonografia das Artérias Carótidas, Vertebrais e Fístulas", tab: "SP" },
  { code: "CM US COLP.SP", name: "Colposcopia", tab: "SP" },
  { code: "CM US DOGO.SP", name: "Ultrassonografia com Doppler em Ginecologia e Obstetrícia", tab: "SP" },
  { code: "CM US DPMI.SP", name: "Doppler em Medicina Interna", tab: "SP" },
  { code: "CM US HYCY.SP", name: "Histerossonografia e Histerossonossalpingografia (HyCoSy) com mentoria", tab: "SP" },
  { code: "CM US PARI.SP", name: "Ultrassonografia da Parede Abdominal, Região Inguinal e Bolsa testicular com Doppler", tab: "SP" },
  { code: "CM US POCE.SP", name: "Essencial: ultrassom em urgências e emergências", tab: "SP" },
  { code: "CM US VAMI.SP", name: "Ultrassonografia com Doppler Venoso e Arterial dos Membros Inferiores", tab: "SP" },
  { code: "CM US SLPA.SP", name: "Ultrassonografia na Sala de Parto", tab: "SP" },
  { code: "CM US ECOA.SP", name: "Ecocardiografia Adulto", tab: "SP" },
  { code: "CM US URGI.SP", name: "Ultrassonografia Urogineco", tab: "SP" },
  { code: "CM US PUVA.SP", name: "Punção Vascular Ecoguiada", tab: "SP" },
  { code: "PG US ECOF.SP", name: "PG US ECOF T1 - Pós-Graduação em Ecocardiografia Fetal", tab: "SP" },
  { code: "PG US ECOV.SP", name: "PG US ECOV T1 - Pós-Graduação em Ultrassonografia Vascular", tab: "SP" },
  { code: "PG US GIOB.SP", name: "PG US GIOB T1 - Pós-Graduação Ultrassonografia em Ginecologia e Obstetrícia", tab: "SP" },
  { code: "PG US MEDI.SP", name: "PG US MEDI T1 - Pós-Graduação Ultrassonografia em Medicina Interna", tab: "SP" },
  { code: "PG US DORM.SP", name: "PG US DORM T1 - Pós-Graduação em Ultrassonografia e Intervenção em Dor", tab: "SP" },
];

// ─── Helpers internos ─────────────────────────────────────────

function normalize(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const BY_CODE = new Map<string, Course>(
  COURSES_SP.map((c) => [normalize(c.code), c]),
);

const BY_NAME = new Map<string, Course>(
  COURSES_SP.map((c) => [normalize(c.name), c]),
);

// ─── API pública ──────────────────────────────────────────────

export function findCourseByCode(code: string): Course | null {
  return BY_CODE.get(normalize(code)) ?? null;
}

export function findCourseByName(name: string): Course | null {
  return BY_NAME.get(normalize(name)) ?? null;
}

export function findCourse(query: string): Course | null {
  if (!query?.trim()) return null;
  return findCourseByCode(query) ?? findCourseByName(query) ?? null;
}

export function resolveName(query: string): string | null {
  return findCourse(query)?.name ?? null;
}

export function resolveCode(query: string): string | null {
  return findCourse(query)?.code ?? null;
}

export function isSPCourse(query: string): boolean {
  return findCourse(query)?.tab === "SP";
}
