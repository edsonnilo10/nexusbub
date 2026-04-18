import { useMemo, useState, useEffect, useRef } from "react";
import type { jsPDF } from "jspdf";
import { Download, Loader2, Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseFull, CourseModule, CourseClass, formatBRL, unitLabel, formatClassDateRange, classStatusLabel } from "@/lib/courseHelpers";
import nexusBrand from "@/assets/nexus-logo-official.jpg";
import { toast } from "@/hooks/use-toast";
import { useCourseOverrides } from "@/hooks/useCourseOverrides";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

const formatLong = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} | ${days[d.getDay()]}`;
};

const TOTAL_PAGES = 8;

type PdfColor = readonly [number, number, number];

interface ProposalPdfData {
  course: CourseFull;
  modules: CourseModule[];
  selectedClass: CourseClass | null;
  courseDays: string[];
  priceValue: string;
  installments: number;
  totalPrice: number;
  installmentValue: number;
  coordinators: string;
}

const PDF_PAGE_WIDTH = 210;
const PDF_PAGE_HEIGHT = 297;
const MM_PER_PT = 0.352778;
const PDF_COLORS = {
  deepGreen: [0, 61, 42],
  green: [13, 107, 79],
  mint: [191, 227, 208],
  soft: [243, 248, 245],
  neutral: [82, 82, 82],
  dark: [38, 38, 38],
  white: [255, 255, 255],
} as const satisfies Record<string, PdfColor>;
const WHY_NEXUS_ITEMS = [
  ["Prática Intensiva", "Realize o maior número de exames em pacientes reais, sob a supervisão de professores renomados."],
  ["Metodologia Inovadora", "Aprenda através de casos clínicos reais e desenvolva suas habilidades de diagnóstico."],
  ["Corpo Docente de Referência", "Conte com mestres e doutores que são referência em suas áreas de atuação."],
  ["Tecnologia de Ponta", "Utilize equipamentos de última geração para aprimorar suas técnicas."],
  ["Acompanhamento Individualizado", "Tenha acesso a professores e monitores sempre que precisar."],
  ["Ambiente Acolhedor", "Sinta-se em casa em nossa escola e faça parte de uma comunidade de aprendizado."],
] as const;
const DIFFERENTIAL_ITEMS = [
  ["Maior Carga Horária de Prática", "Apenas 2 alunos por máquina. Aqui você faz mais exames e ganha mais tempo de prática."],
  ["Monitoria Especializada", "Conte com o apoio de médicos especialistas durante todo o curso."],
  ["Turmas Reduzidas", "Atendimento personalizado para garantir seu aprendizado."],
  ["Infraestrutura Completa", "Tudo o que você precisa para estudar, praticar e evoluir com segurança."],
] as const;

const applyPdfTextStyle = (
  pdf: jsPDF,
  fontSize: number,
  fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal",
  color: PdfColor = PDF_COLORS.dark
) => {
  pdf.setFont("helvetica", fontStyle);
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...color);
};

const writePdfParagraph = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: {
    fontSize?: number;
    lineHeight?: number;
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
    color?: PdfColor;
    align?: "left" | "center" | "right" | "justify";
  }
) => {
  const fontSize = options?.fontSize ?? 12;
  const lineHeight = options?.lineHeight ?? 1.4;
  applyPdfTextStyle(pdf, fontSize, options?.fontStyle ?? "normal", options?.color ?? PDF_COLORS.dark);
  pdf.setLineHeightFactor(lineHeight);
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y, { align: options?.align ?? "left", baseline: "top" });
  return y + pdf.getTextDimensions(lines).h;
};

const drawPdfPill = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    fontSize?: number;
    bgColor?: PdfColor;
    textColor?: PdfColor;
    paddingX?: number;
    height?: number;
    maxWidth?: number;
    borderColor?: PdfColor;
  }
) => {
  const fontSize = options?.fontSize ?? 10;
  const paddingX = options?.paddingX ?? 4;
  const height = options?.height ?? 10;
  applyPdfTextStyle(pdf, fontSize, "bold", options?.textColor ?? PDF_COLORS.white);
  const rawWidth = pdf.getTextWidth(text) + paddingX * 2;
  const width = Math.min(options?.maxWidth ?? rawWidth, rawWidth);
  pdf.setFillColor(...(options?.bgColor ?? PDF_COLORS.green));
  if (options?.borderColor) {
    pdf.setDrawColor(...options.borderColor);
    pdf.roundedRect(x, y, width, height, height / 2, height / 2, "FD");
  } else {
    pdf.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  }
  pdf.text(text, x + width / 2, y + height / 2 + fontSize * MM_PER_PT * 0.25, { align: "center", baseline: "middle" });
  return width;
};

const measurePdfPillWidth = (
  pdf: jsPDF,
  text: string,
  options?: {
    fontSize?: number;
    paddingX?: number;
    maxWidth?: number;
  }
) => {
  const fontSize = options?.fontSize ?? 10;
  const paddingX = options?.paddingX ?? 4;
  applyPdfTextStyle(pdf, fontSize, "bold", PDF_COLORS.white);
  const rawWidth = pdf.getTextWidth(text) + paddingX * 2;
  return Math.min(options?.maxWidth ?? rawWidth, rawWidth);
};

const loadImageAsDataUrl = async (src: string) => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao carregar imagem"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const renderPdfCoverFromElement = async (pdf: jsPDF, coverElement: HTMLElement) => {
  const { default: html2canvas } = await import("html2canvas");
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const images = Array.from(coverElement.querySelectorAll("img"));
  await Promise.all(
    images
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
  );

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const canvas = await html2canvas(coverElement, {
    scale: Math.min(2, window.devicePixelRatio || 2),
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    foreignObjectRendering: true,
    imageTimeout: 0,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: coverElement.scrollWidth,
    windowHeight: coverElement.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  pdf.addImage(imgData, "JPEG", 0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);
};

const drawLogoBlock = (pdf: jsPDF, logoDataUrl: string | null, x: number, y: number, size: number) => {
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "JPEG", x, y, size, size);
    return;
  }
  pdf.setFillColor(...PDF_COLORS.white);
  pdf.roundedRect(x, y, size, size, 4, 4, "F");
  applyPdfTextStyle(pdf, 12, "bold", PDF_COLORS.green);
  pdf.text("Nexus", x + size / 2, y + size / 2, { align: "center", baseline: "middle" });
};

const getModuleBullets = (description: string | null) =>
  (description || "")
    .trim()
    .split(/\n+|;\s*/)
    .map((item) => item.replace(/^[-•·*]\s*/, "").trim())
    .filter(Boolean);

const drawProposalPdfPage = (pdf: jsPDF, pageNumber: number, data: ProposalPdfData, logoDataUrl: string | null) => {
  const { course, modules, selectedClass, courseDays, priceValue, installments, totalPrice, installmentValue, coordinators } = data;

  if (pageNumber === 1) {
    pdf.setFillColor(...PDF_COLORS.soft);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    pdf.setFillColor(...PDF_COLORS.deepGreen);
    pdf.rect(0, 0, 18, PDF_PAGE_HEIGHT, "F");
    pdf.setDrawColor(...PDF_COLORS.mint);
    pdf.setLineWidth(6);
    pdf.circle(32, 58, 26, "S");
    pdf.circle(184, 34, 22, "S");
    pdf.circle(176, 252, 28, "S");
    drawLogoBlock(pdf, logoDataUrl, 165, 15, 30);
    pdf.setFillColor(...PDF_COLORS.deepGreen);
    pdf.roundedRect(28, 187, 148, 74, 8, 8, "F");
    writePdfParagraph(pdf, "Proposta de curso", 36, 199, 80, {
      fontSize: 10,
      fontStyle: "bold",
      color: PDF_COLORS.mint,
    });
    writePdfParagraph(pdf, course.name, 36, 212, 125, {
      fontSize: 24,
      fontStyle: "bold",
      color: PDF_COLORS.white,
      lineHeight: 1.15,
    });
    const unitText = `Unidade ${unitLabel(course.unit)}`;
    const unitWidth = drawPdfPill(pdf, unitText, 36, 244, {
      fontSize: 9,
      bgColor: [255, 255, 255],
      textColor: PDF_COLORS.deepGreen,
      maxWidth: 58,
    });
    if (selectedClass?.start_date) {
      drawPdfPill(pdf, `Turma ${formatClassDateRange(selectedClass.start_date, selectedClass.end_date)}`, 36 + unitWidth + 4, 244, {
        fontSize: 8,
        bgColor: [255, 255, 255],
        textColor: PDF_COLORS.deepGreen,
        maxWidth: 96,
      });
    }
    return;
  }

  if (pageNumber === 2) {
    pdf.setFillColor(...PDF_COLORS.white);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    pdf.setFillColor(...PDF_COLORS.mint);
    pdf.circle(190, 28, 30, "F");
    pdf.circle(14, 286, 36, "F");
    pdf.setFillColor(...PDF_COLORS.green);
    pdf.rect(150, 0, 60, PDF_PAGE_HEIGHT, "F");
    drawLogoBlock(pdf, logoDataUrl, 22, 28, 18);
    drawLogoBlock(pdf, logoDataUrl, 159, 111, 42);
    writePdfParagraph(pdf, "Nexus: Sua jornada para a excelência em ultrassonografia começa aqui.", 20, 62, 112, {
      fontSize: 20,
      fontStyle: "bold",
      color: PDF_COLORS.green,
      lineHeight: 1.2,
    });
    writePdfParagraph(
      pdf,
      "Na Nexus, acreditamos que a excelência é mais do que uma palavra: é um compromisso com você. Oferecemos um ambiente acolhedor e personalizado, onde cada médico é protagonista da própria jornada de aprendizado.",
      20,
      108,
      112,
      { fontSize: 12, color: PDF_COLORS.neutral, lineHeight: 1.55 }
    );
    return;
  }

  if (pageNumber === 3) {
    pdf.setFillColor(...PDF_COLORS.white);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    pdf.setFillColor(...PDF_COLORS.green);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, 8, "F");
    pdf.setFillColor(...PDF_COLORS.mint);
    pdf.circle(210, 297, 32, "F");
    writePdfParagraph(pdf, "A ESCOLA", 20, 34, 100, {
      fontSize: 28,
      fontStyle: "bold",
      color: PDF_COLORS.green,
    });
    pdf.setFillColor(...PDF_COLORS.green);
    pdf.rect(20, 47, 16, 1.5, "F");
    writePdfParagraph(
      pdf,
      "Somos uma escola de ultrassonografia diferenciada, formada por docentes qualificados, médicos atuantes e referência em suas áreas, com sólida formação acadêmica e vivência clínica real.",
      20,
      68,
      145,
      { fontSize: 12, color: PDF_COLORS.neutral, lineHeight: 1.55 }
    );
    writePdfParagraph(
      pdf,
      "Nosso compromisso com a excelência combina teoria densa, atualizada e aplicável com trocas práticas entre alunos e professores reconhecidos tanto na academia quanto na rotina médica.",
      20,
      110,
      145,
      { fontSize: 12, color: PDF_COLORS.neutral, lineHeight: 1.55 }
    );
    drawLogoBlock(pdf, logoDataUrl, 20, 174, 20);
    writePdfParagraph(pdf, "Escola Nexus", 46, 179, 60, {
      fontSize: 10,
      fontStyle: "bold",
      color: PDF_COLORS.green,
    });
    writePdfParagraph(pdf, "Ultrassonografia de excelência", 46, 188, 80, {
      fontSize: 12,
      fontStyle: "bold",
      color: PDF_COLORS.neutral,
    });
    return;
  }

  if (pageNumber === 4) {
    pdf.setFillColor(...PDF_COLORS.white);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    drawLogoBlock(pdf, logoDataUrl, 20, 18, 14);
    writePdfParagraph(pdf, "Por que escolher a Nexus?", 20, 42, 130, {
      fontSize: 24,
      fontStyle: "bold",
      color: PDF_COLORS.green,
    });
    pdf.setFillColor(...PDF_COLORS.green);
    pdf.rect(20, 53, 16, 1.5, "F");
    let y = 74;
    WHY_NEXUS_ITEMS.forEach(([title, description]) => {
      pdf.setFillColor(...PDF_COLORS.green);
      pdf.circle(24, y + 4, 1.5, "F");
      writePdfParagraph(pdf, `${title}:`, 30, y, 52, {
        fontSize: 12,
        fontStyle: "bold",
        color: PDF_COLORS.green,
      });
      const titleWidth = pdf.getTextWidth(`${title}: `) + 2;
      const paragraphBottom = writePdfParagraph(pdf, description, 30 + titleWidth, y, 132 - titleWidth, {
        fontSize: 11,
        color: PDF_COLORS.dark,
        lineHeight: 1.5,
      });
      y = Math.max(y + 8, paragraphBottom + 9);
    });
    return;
  }

  if (pageNumber === 5) {
    pdf.setFillColor(...PDF_COLORS.soft);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    writePdfParagraph(pdf, "Na Nexus, você não apenas aprende, você evolui.", 20, 28, 135, {
      fontSize: 20,
      fontStyle: "bold",
      color: PDF_COLORS.green,
      lineHeight: 1.2,
    });
    pdf.setFillColor(...PDF_COLORS.green);
    pdf.rect(20, 45, 16, 1.5, "F");
    DIFFERENTIAL_ITEMS.forEach(([title, description], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 20 + col * 86;
      const y = 66 + row * 62;
      pdf.setFillColor(...PDF_COLORS.white);
      pdf.setDrawColor(...PDF_COLORS.green);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(x, y, 76, 50, 4, 4, "FD");
      pdf.setFillColor(...PDF_COLORS.green);
      pdf.rect(x, y, 2.5, 50, "F");
      writePdfParagraph(pdf, title, x + 6, y + 7, 64, {
        fontSize: 11,
        fontStyle: "bold",
        color: PDF_COLORS.green,
        lineHeight: 1.25,
      });
      writePdfParagraph(pdf, description, x + 6, y + 20, 64, {
        fontSize: 10,
        color: PDF_COLORS.neutral,
        lineHeight: 1.45,
      });
    });
    if (course.workload_hours) {
      drawPdfPill(pdf, `Carga horária total: ${course.workload_hours}h`, 20, 210, {
        fontSize: 11,
        bgColor: PDF_COLORS.green,
        textColor: PDF_COLORS.white,
        height: 13,
        paddingX: 7,
      });
    }
    return;
  }

  if (pageNumber === 6) {
    pdf.setFillColor(...PDF_COLORS.soft);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    let y = writePdfParagraph(pdf, course.name, PDF_PAGE_WIDTH / 2, 20, 150, {
      fontSize: 18,
      fontStyle: "bold",
      color: PDF_COLORS.green,
      align: "center",
      lineHeight: 1.2,
    }) + 8;
    if (coordinators) {
      y = writePdfParagraph(pdf, "Coordenadores:", PDF_PAGE_WIDTH / 2, y, 120, {
        fontSize: 10,
        fontStyle: "bold",
        color: PDF_COLORS.green,
        align: "center",
      }) + 2;
      y = writePdfParagraph(pdf, coordinators, PDF_PAGE_WIDTH / 2, y, 140, {
        fontSize: 10,
        color: PDF_COLORS.neutral,
        align: "center",
      }) + 6;
    }
    if (selectedClass?.start_date) {
      const statusText = `Turma ${classStatusLabel(selectedClass.status)}`;
      const statusWidth = measurePdfPillWidth(pdf, statusText, {
        fontSize: 9,
        paddingX: 4,
      });
      drawPdfPill(pdf, statusText, (PDF_PAGE_WIDTH - statusWidth) / 2, y, {
        fontSize: 9,
        bgColor: PDF_COLORS.green,
        textColor: PDF_COLORS.white,
      });
      y += 14;
      const dateText = formatClassDateRange(selectedClass.start_date, selectedClass.end_date);
      const dateWidth = measurePdfPillWidth(pdf, dateText, {
        fontSize: 9,
        paddingX: 4,
      });
      drawPdfPill(pdf, dateText, (PDF_PAGE_WIDTH - dateWidth) / 2, y, {
        fontSize: 9,
        bgColor: PDF_COLORS.mint,
        textColor: PDF_COLORS.green,
      });
      y += 16;
      if (selectedClass.location) {
        y = writePdfParagraph(pdf, selectedClass.location, PDF_PAGE_WIDTH / 2, y, 120, {
          fontSize: 9,
          color: PDF_COLORS.neutral,
          align: "center",
        }) + 4;
      }
    } else if (courseDays.length > 0) {
      const scheduleText = courseDays.length > 1
        ? `${formatLong(courseDays[0])} até ${formatLong(courseDays[courseDays.length - 1])}`
        : formatLong(courseDays[0]);
      const scheduleWidth = measurePdfPillWidth(pdf, scheduleText, {
        fontSize: 8,
        paddingX: 4,
        maxWidth: 160,
      });
      drawPdfPill(pdf, scheduleText, (PDF_PAGE_WIDTH - scheduleWidth) / 2, y, {
        fontSize: 8,
        bgColor: PDF_COLORS.mint,
        textColor: PDF_COLORS.green,
        maxWidth: 160,
      });
      y += 18;
    }
    if (modules.length === 0) {
      pdf.setFillColor(...PDF_COLORS.white);
      pdf.roundedRect(18, 92, 174, 26, 4, 4, "F");
      writePdfParagraph(pdf, "Nenhum módulo cadastrado ainda. Adicione módulos na aba Informações para aparecerem aqui automaticamente.", 105, 101, 140, {
        fontSize: 10,
        color: PDF_COLORS.neutral,
        align: "center",
      });
      return;
    }
    let moduleY = Math.max(y, 74);
    let truncated = false;
    for (let i = 0; i < modules.length; i += 1) {
      const module = modules[i];
      const bullets = getModuleBullets(module.description).slice(0, 4);
      const estimatedHeight = 16 + Math.max(1, bullets.length) * 7 + (module.workload_hours ? 0 : 0);
      if (moduleY + estimatedHeight > 272) {
        truncated = true;
        break;
      }
      pdf.setFillColor(...PDF_COLORS.white);
      pdf.setDrawColor(...PDF_COLORS.mint);
      pdf.roundedRect(18, moduleY, 174, estimatedHeight, 4, 4, "FD");
      pdf.setFillColor(...PDF_COLORS.green);
      pdf.roundedRect(18, moduleY, 174, 12, 4, 4, "F");
      pdf.setFillColor(...PDF_COLORS.mint);
      pdf.circle(28, moduleY + 6, 4, "F");
      applyPdfTextStyle(pdf, 9, "bold", PDF_COLORS.green);
      pdf.text(String(i + 1), 28, moduleY + 6.3, { align: "center", baseline: "middle" });
      writePdfParagraph(pdf, module.title, 36, moduleY + 3.5, 112, {
        fontSize: 9,
        fontStyle: "bold",
        color: PDF_COLORS.white,
      });
      if (module.workload_hours) {
        drawPdfPill(pdf, `${module.workload_hours}h`, 160, moduleY + 2, {
          fontSize: 8,
          bgColor: [255, 255, 255],
          textColor: PDF_COLORS.green,
          height: 8,
          paddingX: 3,
          maxWidth: 24,
        });
      }
      let bulletY = moduleY + 17;
      if (bullets.length === 0) {
        bulletY = writePdfParagraph(pdf, module.description || "Conteúdo programático prático e aplicado ao contexto clínico.", 24, bulletY, 160, {
          fontSize: 9,
          color: PDF_COLORS.neutral,
          lineHeight: 1.4,
        });
      } else {
        bullets.forEach((bullet) => {
          pdf.setFillColor(...PDF_COLORS.green);
          pdf.circle(25, bulletY + 3, 1.1, "F");
          bulletY = writePdfParagraph(pdf, bullet, 29, bulletY, 154, {
            fontSize: 8.8,
            color: PDF_COLORS.neutral,
            lineHeight: 1.35,
          }) + 1.5;
        });
      }
      moduleY += estimatedHeight + 4;
    }
    if (truncated) {
      writePdfParagraph(pdf, "Conteúdo resumido para caber em uma página. A pré-visualização completa permanece disponível na tela.", 105, 276, 150, {
        fontSize: 8,
        color: PDF_COLORS.neutral,
        align: "center",
      });
    }
    return;
  }

  if (pageNumber === 7) {
    pdf.setFillColor(...PDF_COLORS.white);
    pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
    pdf.setDrawColor(...PDF_COLORS.mint);
    pdf.setLineWidth(8);
    pdf.circle(182, 40, 22, "S");
    pdf.setDrawColor(...PDF_COLORS.green);
    pdf.setLineWidth(9);
    pdf.circle(30, 250, 30, "S");
    pdf.setDrawColor(...PDF_COLORS.green);
    pdf.setLineWidth(0.7);
    pdf.roundedRect(30, 75, 150, 124, 8, 8, "S");
    writePdfParagraph(pdf, "Investimento", 105, 92, 80, {
      fontSize: 16,
      fontStyle: "bold",
      color: PDF_COLORS.green,
      align: "center",
    });
    pdf.setFillColor(...PDF_COLORS.green);
    pdf.roundedRect(53, 114, 104, 42, 5, 5, "F");
    writePdfParagraph(pdf, "Valor total", 105, 123, 80, {
      fontSize: 8,
      fontStyle: "bold",
      color: PDF_COLORS.mint,
      align: "center",
    });
    writePdfParagraph(pdf, `R$ ${priceValue || "--"}`, 105, 134, 90, {
      fontSize: 28,
      fontStyle: "bold",
      color: PDF_COLORS.white,
      align: "center",
      lineHeight: 1,
    });
    if (installments > 1 && totalPrice > 0) {
      pdf.setFillColor(...PDF_COLORS.soft);
      pdf.setDrawColor(...PDF_COLORS.green);
      pdf.roundedRect(55, 167, 100, 28, 4, 4, "FD");
      writePdfParagraph(pdf, "Ou parcele em", 105, 174, 70, {
        fontSize: 9,
        fontStyle: "bold",
        color: PDF_COLORS.green,
        align: "center",
      });
      writePdfParagraph(pdf, `${installments}x de ${formatBRL(installmentValue)}`, 105, 183, 78, {
        fontSize: 16,
        fontStyle: "bold",
        color: PDF_COLORS.green,
        align: "center",
      });
      writePdfParagraph(pdf, "sem juros", 105, 191, 50, {
        fontSize: 8,
        color: PDF_COLORS.neutral,
        align: "center",
      });
    }
    if (course.payment_methods) {
      writePdfParagraph(pdf, course.payment_methods, 105, 210, 120, {
        fontSize: 10,
        color: PDF_COLORS.neutral,
        align: "center",
      });
    }
    return;
  }

  pdf.setFillColor(...PDF_COLORS.deepGreen);
  pdf.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
  pdf.setFillColor(...PDF_COLORS.green);
  pdf.rect(0, 176, PDF_PAGE_WIDTH, 121, "F");
  writePdfParagraph(pdf, "Vamos juntos?", PDF_PAGE_WIDTH / 2, 72, 120, {
    fontSize: 30,
    fontStyle: "bold",
    color: PDF_COLORS.white,
    align: "center",
  });
  writePdfParagraph(pdf, "Fale com nossos consultores", PDF_PAGE_WIDTH / 2, 94, 120, {
    fontSize: 14,
    color: PDF_COLORS.white,
    align: "center",
  });
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(38, 124, 134, 18, 9, 9, "F");
  writePdfParagraph(pdf, "(61) 9904-2880", PDF_PAGE_WIDTH / 2, 130, 90, {
    fontSize: 18,
    fontStyle: "bold",
    color: PDF_COLORS.green,
    align: "center",
  });
  drawLogoBlock(pdf, logoDataUrl, 87, 180, 36);
  writePdfParagraph(
    pdf,
    course.unit === "brasilia"
      ? "SCRN 502 Bloco B - Sala 101 | Asa Norte - Brasília, DF"
      : `Unidade ${unitLabel(course.unit)}`,
    PDF_PAGE_WIDTH / 2,
    230,
    150,
    { fontSize: 10, color: PDF_COLORS.white, align: "center" }
  );
};

const buildProposalPdf = async (data: ProposalPdfData, coverElement?: HTMLElement | null) => {
  const [{ default: JsPDF }, logoDataUrl] = await Promise.all([import("jspdf"), loadImageAsDataUrl(nexusBrand)]);
  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  for (let page = 1; page <= TOTAL_PAGES; page += 1) {
    if (page > 1) pdf.addPage();
    if (page === 1 && coverElement) {
      try {
        await renderPdfCoverFromElement(pdf, coverElement);
        continue;
      } catch {
        drawProposalPdfPage(pdf, page, data, logoDataUrl);
        continue;
      }
    }
    drawProposalPdfPage(pdf, page, data, logoDataUrl);
  }
  return pdf;
};

const sanitizeProposalFileName = (courseName: string) => `Proposta_${courseName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

export const CourseProposal = ({ course, modules, classes }: Props) => {
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { overrides, loaded, save } = useCourseOverrides(course.id);

  const defaultPrice = course.price ? formatBRL(course.price).replace("R$", "").trim() : "0,00";
  const nextClass = useMemo(
    () => classes.find((c) => c.status === "atual") || classes.find((c) => c.status === "proxima") || classes[0] || null,
    [classes]
  );

  // Valores editáveis (preferem o que o usuário salvou; senão, fallback)
  const [priceValue, setPriceValue] = useState<string>(defaultPrice);
  const [installmentsInput, setInstallmentsInput] = useState<string>(
    course.installments ? String(course.installments) : ""
  );
  const installments = Math.max(1, Math.min(24, parseInt(installmentsInput) || 1));
  const [startDate, setStartDate] = useState<string>(nextClass?.start_date || "");
  const [endDate, setEndDate] = useState<string>(nextClass?.end_date || "");
  const [coordinators, setCoordinators] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("manual");

  // Quando overrides carregam, aplica valores salvos do usuário
  useEffect(() => {
    if (!loaded) return;
    setPriceValue(overrides.proposal_price ?? defaultPrice);
    setInstallmentsInput(
      overrides.proposal_installments != null
        ? String(overrides.proposal_installments)
        : course.installments
        ? String(course.installments)
        : ""
    );
    const initStart = overrides.proposal_start_date ?? nextClass?.start_date ?? "";
    const initEnd = overrides.proposal_end_date ?? nextClass?.end_date ?? "";
    setStartDate(initStart);
    setEndDate(initEnd);
    setCoordinators(overrides.proposal_coordinators ?? "");
    // prefere ID salvo; senão tenta casar por datas
    const fromId = overrides.proposal_class_id && classes.find((c) => c.id === overrides.proposal_class_id);
    const match = fromId || classes.find((c) => c.start_date === initStart && (c.end_date || "") === (initEnd || ""));
    setSelectedClassId(match?.id ?? "manual");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const handleClassChange = (id: string) => {
    setSelectedClassId(id);
    if (id === "manual") {
      save({ proposal_class_id: null });
      return;
    }
    const c = classes.find((x) => x.id === id);
    if (!c) return;
    const s = c.start_date || "";
    const e = c.end_date || "";
    setStartDate(s);
    setEndDate(e);
    save({ proposal_start_date: s || null, proposal_end_date: e || null, proposal_class_id: id });
  };

  // Turma selecionada (para exibir nome/local na proposta)
  const selectedClass = useMemo(
    () => (selectedClassId !== "manual" ? classes.find((c) => c.id === selectedClassId) : null),
    [selectedClassId, classes]
  );

  // Cálculo de parcelamento
  const parsePrice = (s: string): number => {
    const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  };
  const totalPrice = parsePrice(priceValue);
  const installmentValue = installments > 0 ? totalPrice / installments : totalPrice;

  // Gera lista de dias entre startDate e endDate
  const courseDays = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const end = endDate ? new Date(endDate + "T00:00:00") : start;
    const days: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const pdf = await buildProposalPdf({
        course,
        modules,
        selectedClass,
        courseDays,
        priceValue,
        installments,
        totalPrice,
        installmentValue,
        coordinators,
      });
      pdf.save(sanitizeProposalFileName(course.name));
      toast({ title: "Proposta baixada", description: "PDF salvo com sucesso. Já dá pra mandar no WhatsApp." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Painel de edição */}
      <Card className="border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Personalize a proposta</h3>
            <p className="text-xs text-muted-foreground">
              Edite o valor e as datas — suas alterações são <strong>salvas automaticamente</strong> só na sua conta.
            </p>
          </div>
          <Button onClick={handleDownload} disabled={downloading} className="w-full sm:w-auto sm:shrink-0">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar PDF
          </Button>
        </div>
        {classes.length > 0 && (
          <div className="mb-3">
            <Label className="text-xs">Turma</Label>
            <Select value={selectedClassId} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma cadastrada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">✏️ Datas personalizadas (manual)</SelectItem>
                {classes
                  .filter((c) => c.start_date)
                  .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatClassDateRange(c.start_date, c.end_date)} — {classStatusLabel(c.status)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Escolha uma turma da aba <strong>Turmas</strong> para preencher as datas automaticamente.
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Valor total (R$)</Label>
            <Input
              value={priceValue}
              onChange={(e) => {
                setPriceValue(e.target.value);
                save({ proposal_price: e.target.value });
              }}
              placeholder="3.990,00"
            />
          </div>
          <div>
            <Label className="text-xs">Parcelas (sem juros)</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Ex.: 1, 3, 10..."
              value={installmentsInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                setInstallmentsInput(raw);
                const n = raw === "" ? null : Math.max(1, Math.min(24, parseInt(raw)));
                save({ proposal_installments: n });
              }}
            />
            {totalPrice > 0 && installments > 1 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {installments}x de <strong>{formatBRL(installmentValue)}</strong>
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Data início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedClassId("manual");
                save({ proposal_start_date: e.target.value || null });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Data fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedClassId("manual");
                save({ proposal_end_date: e.target.value || null });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Coordenadores (opcional)</Label>
            <Input
              value={coordinators}
              onChange={(e) => {
                setCoordinators(e.target.value);
                save({ proposal_coordinators: e.target.value });
              }}
              placeholder="Dr. Fulano | Dra. Ciclana"
            />
          </div>
        </div>
      </Card>

      {/* Navegador de páginas (prévia) */}
      <Card className="p-3 sm:p-4">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Pré-visualização</h3>
            <p className="text-[11px] text-muted-foreground">
              Confira página por página antes de baixar — exatamente como vai sair no PDF.
            </p>
          </div>
          <div className="shrink-0 text-xs font-medium text-muted-foreground">
            Página {currentPage} de {TOTAL_PAGES}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              size="sm"
              variant={currentPage === n ? "default" : "outline"}
              className="h-8 w-8 p-0 text-xs"
              onClick={() => setCurrentPage(n)}
            >
              {n}
            </Button>
          ))}
          <div className="ml-auto flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(TOTAL_PAGES, p + 1))}
              disabled={currentPage === TOTAL_PAGES}
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          💡 Mesmo vendo só uma página aqui, todas as {TOTAL_PAGES} páginas são exportadas no PDF.
        </p>
      </Card>

      <div className="overflow-x-auto">
        <div
          data-active-page={currentPage}
          className="proposal-doc mx-auto bg-white text-[#0a3d2e]"
          style={{ width: "210mm", fontFamily: "Arial, Helvetica, sans-serif", textRendering: "geometricPrecision" }}
        >
          {/* PAGE 1 — Capa */}
          <section className="proposal-page relative overflow-hidden" style={pageStyle}>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#f3f8f5_0%,#dceee6_28%,#75b79b_62%,#0d6b4f_100%)]" />
            <div className="absolute -left-[22mm] top-[22mm] h-[150mm] w-[150mm] rounded-full border-[18mm] border-white/18" />
            <div className="absolute right-[-10mm] top-[-18mm] h-[120mm] w-[120mm] rounded-full bg-white/10 blur-[2px]" />
            <div className="absolute bottom-[-28mm] right-[12mm] h-[140mm] w-[140mm] rounded-full border-[22mm] border-white/12" />
            <div className="absolute inset-y-0 left-0 w-[18mm] bg-[#003d2a]" />

            <div className="absolute right-[15mm] top-[15mm] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <img
                src={nexusBrand}
                alt="Nexus"
                className="block h-[30mm] w-[30mm] object-cover"
                crossOrigin="anonymous"
              />
            </div>

            <div className="absolute bottom-[25mm] left-[28mm] w-[138mm] rounded-[10mm] bg-[#003d2a] p-9 shadow-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a8d9c5]">
                Proposta de curso
              </div>
              <h1 className="mt-3 text-[36px] font-bold leading-[1.08] text-white">{course.name}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 ring-1 ring-white/40">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-semibold text-white">Unidade {unitLabel(course.unit)}</span>
                </div>
                {selectedClass && selectedClass.start_date && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 ring-1 ring-white/40">
                    <span className="text-xs font-semibold text-white">
                      Turma: {formatClassDateRange(selectedClass.start_date, selectedClass.end_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* PAGE 2 — Manifesto */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="absolute right-[-30mm] top-[-30mm] h-[120mm] w-[120mm] rounded-full bg-[#0d6b4f]/8" />
            <div className="absolute bottom-[-40mm] left-[-40mm] h-[140mm] w-[140mm] rounded-full bg-[#0d6b4f]/6" />
            <div className="relative grid h-full grid-cols-[1fr_60mm]">
              <div className="flex flex-col justify-center p-[20mm]">
                <img src={nexusBrand} alt="Nexus" className="mb-8 h-[18mm] w-[18mm] rounded-lg object-cover shadow-md" crossOrigin="anonymous" />
                <h2 className="text-[26px] font-bold leading-tight text-[#0d6b4f]">
                  Nexus: Sua jornada para a excelência em ultrassonografia começa aqui.
                </h2>
                <p className="mt-6 text-[14px] leading-relaxed text-neutral-700">
                  Na Nexus, acreditamos que a excelência é mais do que uma palavra, é um compromisso
                  com você. Oferecemos um ambiente acolhedor e personalizado, onde você, médico, é o
                  protagonista da sua jornada de aprendizado.
                </p>
              </div>
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0d6b4f] to-[#003d2a] p-[10mm]">
                <img src={nexusBrand} alt="Nexus" className="h-[44mm] w-[44mm] rounded-2xl object-cover shadow-2xl ring-4 ring-white/30" crossOrigin="anonymous" />
              </div>
            </div>
          </section>

          {/* PAGE 3 — A Escola */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="absolute left-0 top-0 h-[8mm] w-full bg-[#0d6b4f]" />
            <div className="absolute bottom-0 right-0 h-[60mm] w-[60mm] rounded-tl-[60mm] bg-[#0d6b4f]/10" />
            <div className="relative flex h-full flex-col justify-center p-[20mm]">
              <h2 className="text-[34px] font-bold text-[#0d6b4f]">A ESCOLA</h2>
              <div className="mt-2 h-1 w-16 bg-[#0d6b4f]" />
              <p className="mt-8 max-w-[140mm] text-[14px] leading-relaxed text-neutral-700">
                Somos uma escola de ultrassonografia diferenciada, formada por docentes qualificados,
                médicos atuantes que são referência em suas áreas, com sólida e extensa formação
                acadêmica.
              </p>
              <p className="mt-4 max-w-[140mm] text-[14px] leading-relaxed text-neutral-700">
                Temos um compromisso com a excelência no ensino da ultrassonografia. Por isso, além
                da teoria densa, detalhada e atualizada, na Nexus, o aluno médico tem a oportunidade
                de trocar experiências com profissionais professores reconhecidos não só na área
                acadêmica, mas também na clínica médica.
              </p>
              <div className="mt-12 flex items-center gap-4">
                <img src={nexusBrand} alt="Nexus" className="h-[20mm] w-[20mm] rounded-xl object-cover shadow-md ring-2 ring-[#0d6b4f]/20" crossOrigin="anonymous" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0d6b4f]">Escola Nexus</div>
                  <div className="text-sm font-bold text-neutral-700">Ultrassonografia de Excelência</div>
                </div>
              </div>
            </div>
          </section>

          {/* PAGE 4 — Por que escolher */}
          <section className="proposal-page relative bg-white" style={pageStyle}>
            <div className="p-[20mm]">
              <img src={nexusBrand} alt="Nexus" className="mb-6 h-[14mm] w-[14mm] rounded-lg object-cover shadow-md" crossOrigin="anonymous" />
              <h2 className="text-[30px] font-bold text-[#0d6b4f]">Por que escolher a Nexus?</h2>
              <div className="mt-2 h-1 w-16 bg-[#0d6b4f]" />
              <ul className="mt-10 space-y-5 text-[13px] leading-relaxed text-neutral-800">
                {[
                  ["Prática Intensiva", "Realize o maior número de exames em pacientes reais, sob a supervisão de professores renomados."],
                  ["Metodologia Inovadora", "Aprenda através de casos clínicos reais e desenvolva suas habilidades de diagnóstico."],
                  ["Corpo Docente de Referência", "Conte com mestres e doutores que são referência em suas áreas de atuação."],
                  ["Tecnologia de Ponta", "Utilize equipamentos de última geração para aprimorar suas técnicas."],
                  ["Acompanhamento Individualizado", "Tenha acesso a professores e monitores sempre que precisar."],
                  ["Ambiente Acolhedor", "Sinta-se em casa em nossa escola e faça parte de uma comunidade de aprendizado."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0d6b4f]" />
                    <div>
                      <span className="font-bold text-[#0d6b4f]">{t}: </span>
                      <span>{d}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* PAGE 5 — Diferenciais */}
          <section className="proposal-page relative" style={{ ...pageStyle, backgroundColor: "#f3f8f5" }}>
            <div style={{ padding: "20mm" }}>
              <h2 style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1.15, color: "#0d6b4f" }}>
                Na Nexus, você não apenas aprende, você evolui.
              </h2>
              <div style={{ marginTop: "8px", height: "4px", width: "64px", backgroundColor: "#0d6b4f" }} />
              <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {[
                  ["Maior Carga Horária de Prática", "Apenas 2 alunos/máquina. Aqui você faz mais exames e ganha mais tempo de máquina."],
                  ["Monitoria Especializada", "Conte com o apoio de médicos especialistas durante todo o curso."],
                  ["Turmas Reduzidas", "Atendimento personalizado para garantir seu aprendizado."],
                  ["Infraestrutura Completa", "Tudo o que você precisa para estudar e praticar."],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    style={{
                      borderRadius: "16px",
                      borderLeft: "4px solid #0d6b4f",
                      backgroundColor: "#ffffff",
                      padding: "20px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                  >
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0d6b4f", margin: 0 }}>{t}</h3>
                    <p style={{ marginTop: "8px", fontSize: "12px", lineHeight: 1.5, color: "#404040" }}>{d}</p>
                  </div>
                ))}
              </div>
              {course.workload_hours && (
                <div
                  style={{
                    marginTop: "40px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "9999px",
                    backgroundColor: "#0d6b4f",
                    padding: "12px 24px",
                    color: "#ffffff",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>Carga horária total:</span>
                  <span style={{ fontSize: "18px", fontWeight: 700 }}>{course.workload_hours}h</span>
                </div>
              )}
            </div>
          </section>

          {/* PAGE 6 — Programa do curso */}
          <section className="proposal-page relative bg-[#f3f8f5]" style={pageStyle}>
            <div className="p-[18mm]">
              <h2 className="text-center text-[24px] font-bold uppercase text-[#0d6b4f]">
                {course.name}
              </h2>
              {coordinators && (
                <div className="mt-4 text-center">
                  <div className="text-sm font-bold text-[#0d6b4f]">Coordenadores:</div>
                  <div className="text-sm text-neutral-700">{coordinators}</div>
                </div>
              )}

              {selectedClass && selectedClass.start_date ? (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="rounded-full bg-[#0d6b4f] px-6 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md">
                    Turma {classStatusLabel(selectedClass.status)}
                  </div>
                  <div className="rounded-full bg-[#bfe3d0] px-6 py-2 text-sm font-bold text-[#0d6b4f]">
                    {formatClassDateRange(selectedClass.start_date, selectedClass.end_date)}
                  </div>
                  {selectedClass.location && (
                    <div className="text-xs text-neutral-600">📍 {selectedClass.location}</div>
                  )}
                </div>
              ) : courseDays.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <div className="rounded-full bg-[#bfe3d0] px-6 py-2 text-sm font-bold text-[#0d6b4f]">
                    {formatLong(courseDays[0])}
                    {courseDays.length > 1 && ` → ${formatLong(courseDays[courseDays.length - 1])}`}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3">
                {modules.length === 0 ? (
                  <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500">
                    Nenhum módulo cadastrado ainda. Adicione módulos na aba "Informações" para
                    aparecerem aqui automaticamente.
                  </div>
                ) : (
                  modules.map((m, i) => {
                    // Parse description as bullet points if it contains line breaks or semicolons
                    const desc = (m.description || "").trim();
                    const bullets = desc
                      ? desc
                          .split(/\n+|;\s*/)
                          .map((s) => s.replace(/^[-•·*]\s*/, "").trim())
                          .filter(Boolean)
                      : [];

                    return (
                      <div key={m.id} className="overflow-hidden rounded-xl border border-[#0d6b4f]/20 bg-white shadow-sm">
                        <div className="flex items-center gap-3 bg-[#0d6b4f] px-4 py-2.5 text-white">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1 text-sm font-bold leading-snug">{m.title}</div>
                          {m.workload_hours ? (
                            <div className="shrink-0 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-semibold">
                              {m.workload_hours}h
                            </div>
                          ) : null}
                        </div>
                        {bullets.length > 0 && (
                          <ul className="space-y-1.5 px-5 py-3 text-[12px] leading-relaxed text-neutral-700">
                            {bullets.map((b, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d6b4f]" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* PAGE 7 — Valor */}
          <section className="proposal-page relative" style={{ ...pageStyle, backgroundColor: "#ffffff" }}>
            <div
              style={{
                position: "absolute",
                right: "10mm",
                top: "10mm",
                height: "80mm",
                width: "80mm",
                borderRadius: "9999px",
                border: "18mm solid rgba(191, 227, 208, 0.4)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "10mm",
                left: "10mm",
                height: "100mm",
                width: "100mm",
                borderRadius: "9999px",
                border: "20mm solid rgba(13, 107, 79, 0.3)",
              }}
            />
            <div
              style={{
                position: "relative",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20mm",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "150mm",
                  borderRadius: "24px",
                  border: "2px solid #0d6b4f",
                  backgroundColor: "#ffffff",
                  padding: "18mm",
                  textAlign: "center",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0d6b4f" }}>Investimento</div>
                <div
                  style={{
                    marginTop: "20px",
                    display: "inline-block",
                    borderRadius: "16px",
                    backgroundColor: "#0d6b4f",
                    padding: "24px 40px",
                    color: "#ffffff",
                    boxShadow: "0 8px 20px rgba(13,107,79,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.25em",
                      color: "#bfe3d0",
                    }}
                  >
                    Valor total
                  </div>
                  <div style={{ marginTop: "4px", fontSize: "44px", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>
                    R$ {priceValue || "—"}
                  </div>
                </div>
                {installments > 1 && totalPrice > 0 && (
                  <div
                    style={{
                      marginTop: "24px",
                      display: "inline-block",
                      borderRadius: "16px",
                      border: "2px dashed #0d6b4f",
                      backgroundColor: "#f3f8f5",
                      padding: "20px 32px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#0d6b4f",
                      }}
                    >
                      Ou parcele em
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "28px", fontWeight: 800, lineHeight: 1, color: "#0d6b4f" }}>
                      {installments}x de {formatBRL(installmentValue)}
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#525252" }}>sem juros</div>
                  </div>
                )}
                {course.payment_methods && (
                  <div style={{ marginTop: "20px", fontSize: "12px", color: "#737373" }}>{course.payment_methods}</div>
                )}
              </div>
            </div>
          </section>

          {/* PAGE 8 — Contato */}
          <section
            className="proposal-page relative flex flex-col items-center justify-center text-white"
            style={{ ...pageStyle, background: "linear-gradient(135deg, #003d2a 0%, #0d6b4f 60%, #0a5a40 100%)" }}
          >
            <h2 className="text-[42px] font-extrabold uppercase tracking-tight">Vamos juntos?</h2>
            <p className="mt-3 text-lg">Fale com nossos consultores</p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-white/15 px-8 py-4 ring-1 ring-white/30 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0d6b4f]">
                <Phone className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold">(61) 9904-2880</span>
            </div>
            <div className="mt-20 overflow-hidden rounded-2xl shadow-xl ring-2 ring-white/40">
              <img src={nexusBrand} alt="Nexus" className="block h-[36mm] w-[36mm] object-cover" crossOrigin="anonymous" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm opacity-90">
              <MapPin className="h-4 w-4" />
              <span>
                {course.unit === "brasilia"
                  ? "SCRN 502 Bloco B – Sala 101 | Asa Norte – Brasília, DF"
                  : `Unidade ${unitLabel(course.unit)}`}
              </span>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .proposal-page {
          page-break-after: always;
          break-after: page;
        }
        .proposal-page:last-child {
          page-break-after: auto;
        }
        .proposal-doc[data-active-page="1"] .proposal-page:not(:nth-child(1)),
        .proposal-doc[data-active-page="2"] .proposal-page:not(:nth-child(2)),
        .proposal-doc[data-active-page="3"] .proposal-page:not(:nth-child(3)),
        .proposal-doc[data-active-page="4"] .proposal-page:not(:nth-child(4)),
        .proposal-doc[data-active-page="5"] .proposal-page:not(:nth-child(5)),
        .proposal-doc[data-active-page="6"] .proposal-page:not(:nth-child(6)),
        .proposal-doc[data-active-page="7"] .proposal-page:not(:nth-child(7)),
        .proposal-doc[data-active-page="8"] .proposal-page:not(:nth-child(8)) {
          display: none;
        }
        .proposal-doc[data-exporting="true"] .proposal-page {
          display: block !important;
        }
      `}</style>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  width: "210mm",
  height: "297mm",
  position: "relative",
  overflow: "hidden",
};
