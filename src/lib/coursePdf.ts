import jsPDF from "jspdf";
import nexusLogo from "@/assets/nexus-logo-official.jpg";
import { CourseFull, CourseModule, formatBRL } from "@/lib/courseHelpers";

export interface CoursePdfData {
  course: CourseFull;
  modules: CourseModule[];
  yearLabel: string;
  coordinator?: string | null;
  dates: string[];
  moduleCount?: number;
  locationText: string;
}

const GREEN: [number, number, number] = [0, 94, 67];
const GREEN_LIGHT: [number, number, number] = [232, 243, 239];
const GOLD: [number, number, number] = [217, 166, 38];
const DARK: [number, number, number] = [10, 33, 26];
const MUTED: [number, number, number] = [84, 105, 98];

const toDataUrl = async (src: string) => {
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
};

const clean = (t: string) => t.replace(/[^\u0000-\u00FF\u2013\u2014\u2022\u201C\u201D\u2018\u2019]/g, "").trim();

/** Gera o PDF institucional Nexus do curso (modelo reutilizável para 2027 e próximos anos). */
export const buildCoursePdf = async (data: CoursePdfData): Promise<jsPDF> => {
  const { course, modules, yearLabel, coordinator, dates, locationText } = data;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  let logo: string | null = null;
  try { logo = await toDataUrl(nexusLogo); } catch { logo = null; }

  const footer = () => {
    doc.setFillColor(...GREEN);
    doc.rect(0, H - 34, W, 34, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Nexus Ultrassonografia  •  Educação médica em ultrassonografia", M, H - 14);
    doc.text(`Turma ${yearLabel}`, W - M, H - 14, { align: "right" });
  };
  const smallHeader = () => {
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 8, "F");
    if (logo) doc.addImage(logo, "JPEG", M, 22, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text(clean(course.name), M + 36, 39, { maxWidth: W - 2 * M - 36 });
  };

  // Capa
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 300, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 300, W, 4, "F");
  if (logo) doc.addImage(logo, "JPEG", M, 44, 64, 64);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${course.type === "pos_graduacao" ? "PÓS-GRADUAÇÃO" : "CURSO MODULAR"}  •  TURMA ${yearLabel}`, M, 146);
  doc.setFontSize(23);
  const title = doc.splitTextToSize(clean(course.name), W - 2 * M);
  doc.text(title.slice(0, 4), M, 178, { lineHeightFactor: 1.2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(clean(locationText), M, 282, { maxWidth: W - 2 * M });

  // Cartões de informação
  let y = 336;
  const info: [string, string][] = [];
  if (course.workload_hours) info.push(["Carga horária", `${course.workload_hours}h`]);
  info.push(["Módulos", String(data.moduleCount || modules.length || dates.length || "—")]);
  if (coordinator) info.push(["Coordenação", clean(coordinator)]);
  if (course.modality) info.push(["Modalidade", clean(course.modality)]);
  const cw = (W - 2 * M - 12 * (info.length - 1)) / info.length;
  info.forEach(([k, v], i) => {
    const x = M + i * (cw + 12);
    doc.setFillColor(...GREEN_LIGHT);
    doc.roundedRect(x, y, cw, 58, 6, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), x + 10, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(v, cw - 20).slice(0, 2), x + 10, y + 34);
    doc.setFont("helvetica", "normal");
  });
  y += 86;

  const section = (label: string) => {
    if (y > H - 120) { footer(); doc.addPage(); smallHeader(); y = 76; }
    doc.setFillColor(...GOLD);
    doc.rect(M, y - 10, 4, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...GREEN);
    doc.text(label, M + 12, y + 2);
    y += 20;
  };
  const para = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...DARK);
    for (const line of doc.splitTextToSize(clean(text), W - 2 * M)) {
      if (y > H - 56) { footer(); doc.addPage(); smallHeader(); y = 76; }
      doc.text(line, M, y);
      y += size * 1.45;
    }
  };

  if (course.description) { section("Sobre o curso"); para(course.description.slice(0, 1400)); y += 10; }

  section(`Calendário ${yearLabel}`);
  if (dates.length === 0) para("Datas a confirmar pela secretaria acadêmica.");
  dates.forEach((d, i) => {
    if (y > H - 64) { footer(); doc.addPage(); smallHeader(); y = 76; }
    doc.setFillColor(i % 2 ? 255 : 246, i % 2 ? 255 : 250, i % 2 ? 255 : 248);
    doc.rect(M, y - 13, W - 2 * M, 22, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...GREEN);
    doc.text(`Módulo ${i + 1}`, M + 10, y + 2);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...DARK);
    doc.text(clean(d), W - M - 10, y + 2, { align: "right" });
    y += 22;
  });
  if (dates.length > 0 && data.moduleCount && dates.length < data.moduleCount) {
    y += 6; para("As demais datas serão confirmadas em breve pela secretaria acadêmica.", 9);
  }
  y += 14;

  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
  if (sorted.length) {
    section("Conteúdo programático");
    sorted.forEach((m, i) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
      if (y > H - 64) { footer(); doc.addPage(); smallHeader(); y = 76; }
      const head = doc.splitTextToSize(`${i + 1}. ${clean(m.title)}${m.workload_hours ? ` (${m.workload_hours}h)` : ""}`, W - 2 * M);
      doc.text(head, M, y); y += head.length * 14;
      if (m.description) { para(m.description.slice(0, 380), 9); }
      y += 4;
    });
    y += 10;
  }

  if (course.highlights) { section("Diferenciais"); para(course.highlights.slice(0, 900)); y += 10; }

  if (course.price) {
    section("Investimento");
    para(`${formatBRL(course.price)}${course.installments ? ` em até ${course.installments}x` : ""}${course.payment_methods ? ` • ${course.payment_methods}` : ""}`);
  }

  footer();
  return doc;
};

export const coursePdfFilename = (course: CourseFull, year: string) =>
  `Nexus - ${(course.mnemonic || course.name).replace(/[\\/:*?"<>|.]/g, " ").replace(/\s+/g, " ").trim()} - Turma ${year}.pdf`;
