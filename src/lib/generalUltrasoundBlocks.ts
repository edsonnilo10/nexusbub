import { CourseClass, CourseFull, CourseUnit, unitLabel } from "./courseHelpers";

export const isGeneralUltrasoundPostgraduate = (course: CourseFull) =>
  course.type === "pos_graduacao" &&
  (["PG US GERAL", "PG US USGR"].includes(course.mnemonic ?? "") || /ultrassonografia geral/i.test(course.name));

export const generalUltrasoundBlocks = [
  { label: "Bloco 1 — Inicial", courses: [
    ["CM US GIOB", "Básico de US em Ginecologia e Obstetrícia", 60],
    ["CM US TRVG", "Ultrassonografia Transvaginal", 30],
    ["CM US MEDI", "Básico de US em Medicina Interna", 60],
    ["CM US POCE", "POCUS Essencial — urgências e emergências", 30],
    ["CM US MAMA", "Ultrassonografia Mamária Diagnóstica", 30],
    ["CM US TIRD", "US da Tireoide com Doppler, Cervical e Glândulas Salivares", 20],
  ] },
  { label: "Bloco 2 — Intermediário", courses: [
    ["CM US PARI", "US da Parede Abdominal, Região Inguinal e Bolsa Testicular com Doppler", 30],
    ["CM US DOGO", "US com Doppler em Ginecologia e Obstetrícia", 30],
    ["CM US DPMI", "Doppler em Medicina Interna", 30],
  ] },
  { label: "Bloco 3 — Avançado", courses: [
    ["CM US MOR1", "Ultrassonografia Morfológica — 1º trimestre", 25],
    ["CM US MOR2", "Ultrassonografia Morfológica — 2º trimestre", 25],
    ["CM US MESQ", "Ultrassonografia do Musculoesquelético", 40],
    ["CM US VAMI", "US com Doppler Venoso dos Membros Inferiores", 35],
    ["CM US CAVF", "US das Artérias Carótidas, Vertebrais e Fístulas", 30],
  ] },
] as const;

const shortDate = (date: string) => date.split("-").reverse().join("/");
export const generalUltrasoundBlockMessage = (
  blockIndex: number,
  unit: CourseUnit,
  year: number,
  courses: Pick<CourseFull, "id" | "mnemonic" | "unit">[],
  classes: CourseClass[],
  today = new Date().toISOString().slice(0, 10),
) => {
  const block = generalUltrasoundBlocks[blockIndex];
  if (!block) return "";
  const lines = ["*PÓS-GRADUAÇÃO EM ULTRASSONOGRAFIA GERAL*", `*${block.label} | ${unitLabel(unit)} | ${year}*`, "",
    blockIndex === 0 ? "Você pode iniciar a pós por qualquer curso do Bloco 1. Estas são as opções de datas previstas:" : `Após concluir o Bloco ${blockIndex}, estas são as opções de datas previstas para o próximo bloco:`, ""];
  for (const [code, name, hours] of block.courses) {
    const ids = new Set(courses.filter(c => c.unit === unit && c.mnemonic === code).map(c => c.id));
    const dates = [...new Set(classes.filter(c => ids.has(c.course_id) && c.status !== "encerrada" && c.start_date && c.start_date >= today && Number(c.start_date.slice(0, 4)) === year)
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))
      .map(c => c.start_date ? `${shortDate(c.start_date)}${c.end_date && c.end_date !== c.start_date ? ` a ${shortDate(c.end_date)}` : ""}` : ""))];
    lines.push(`▪️ *${name} (${hours}h)*`, dates.length ? dates.join(" • ") : "Datas a confirmar.", "");
  }
  lines.push("Toda a pós deve ser realizada na mesma cidade. As datas serão confirmadas pela secretaria com 1 mês de antecedência.", "",
    blockIndex === 2 ? "Após concluir o Bloco 3, segue o TCC (20h)." : "Sequência obrigatória: Bloco 1 → Bloco 2 → Bloco 3 → TCC.", "",
    "Me diga quais datas se encaixam na sua rotina para alinharmos seu cronograma.");
  return lines.join("\n");
};