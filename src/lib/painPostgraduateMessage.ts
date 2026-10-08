import { CourseFull, formatBRL, unitLabel } from "./courseHelpers";

export const isPainPostgraduate = (course: CourseFull): boolean =>
  course.type === "pos_graduacao" &&
  course.name.toLowerCase().includes("intervenções ambulatoriais em dor");

/** Resumo editorial do documento: todos os módulos, sem copiar tópicos repetidos. */
export const painPostgraduateMessage = (
  course: CourseFull,
  year: number,
  dates: string[],
  location: string,
  pendingDates = false,
): string => {
  const lines = [
    `*PÓS-GRADUAÇÃO LATO SENSU EM INTERVENÇÕES AMBULATORIAIS EM DOR – NEXUS ${year}*`,
    "",
    "Formação teórico-prática no controle da dor aguda e crônica, com procedimentos guiados por ultrassonografia e abordagem multidimensional da dor.",
    "",
    "*Coordenação:* Dr. Erik Halex Barone dos Santos — Medicina Física e Reabilitação, HC FMUSP; título ABMFR; CEO da Clínica Barone Rehab.",
    `🕒 *Carga horária:* ${course.workload_hours ?? "A confirmar"}h${course.workload_breakdown ? ` — ${course.workload_breakdown}` : ""}.`,
    `📍 *Local:* ${location || unitLabel(course.unit)}`,
    "",
    "🗓️ *DATAS DAS TURMAS*",
    ...(dates.length ? dates : ["Datas a confirmar."]),
    ...(pendingDates ? ["Nossa secretaria acadêmica irá confirmar o restante das datas em breve. Estão acertando com a coordenação."] : []),
    "",
    "*O QUE VOCÊ VAI DOMINAR*",
    "▪️ *1. Point of care e ultrassonografia:* fundamentos físicos, diagnóstico e terapia, equipamentos, imagem, ergonomia, segurança e anatomia intervencionista.",
    "▪️ *2. Síndromes miofasciais e dor complexa regional:* fisiopatologia, diagnóstico diferencial, pontos-gatilho e intervenções guiadas.",
    "▪️ *3. Artrose de joelho, quadril e ombro:* avaliação clínica e por imagem, diagnóstico e infiltrações intra e periarticulares.",
    "▪️ *4. Tendinites:* modelo Continuum, indicações intervencionistas e infiltrações em epicondilites e manguito rotador.",
    "▪️ *5. Bloqueios diagnósticos e analgésicos:* nervos periféricos, indicações, farmacologia, técnicas guiadas e manejo de complicações.",
    "▪️ *6. Tornozelo:* traumas agudos e sequelas, exame físico, estabilidade, farmacologia e abordagens guiadas com segurança.",
    "▪️ *7. Biomecânica, palmilhas e dor no esporte:* cadeias cinéticas, postura, podobarometria, prescrição, periodização e retorno à atividade.",
    "▪️ *8. PRP e tecnologias:* terapias regenerativas e minimamente invasivas, indicações, limitações, evidências e custo-benefício.",
    "▪️ *9. Dor na coluna:* anatomia funcional, dor cervical, torácica e lombar, diagnóstico diferencial e intervenções guiadas.",
    "▪️ *10. Punho e pequenas articulações:* avaliação, indicação e planejamento de intervenções, limitações e acessos difíceis.",
    "▪️ *11. Toxina botulínica:* mecanismo, indicações, protocolos, doses, segurança, efeitos adversos e técnicas guiadas.",
    "▪️ *12. TCC:* apresentação dos trabalhos e encerramento.",
    "",
    "*DIFERENCIAIS DETERMINANTES*",
    "✅ Prática com pacientes reais e procedimentos patológicos; tomada de decisão ética e integração diagnóstica e terapêutica.",
    "✅ Professores de referência e equipamentos de ultrassonografia de última geração de diferentes empresas.",
    "",
    "🕒 *CRONOGRAMA E LOGÍSTICA*",
    "12 meses e 12 módulos presenciais: sextas e sábados o dia todo; domingos pela manhã. Até 25 alunos. Frequência mínima de 75%. TCC: artigo científico, relato de caso ou revisão de literatura.",
    "",
    "*Público-alvo:* anestesistas, ortopedistas/traumatologistas, médicos da dor, fisiatras, reumatologistas, neurologistas, neurocirurgiões, radiologistas/intervencionistas e ultrassonografistas gerais.",
  ];
  if (course.price) {
    lines.push("", "💰 *INVESTIMENTO*", `À vista: *${formatBRL(course.price)}*`);
    if (course.installments && course.installments > 1) {
      lines.push(`Parcelado: *${course.installments}x de ${formatBRL(course.price / course.installments)}*`);
    }
    if (course.payment_methods) lines.push(course.payment_methods);
  }
  lines.push("", "🎓 *Pré-Requisito:* Graduação em Medicina.", "Se quiser, posso te passar os detalhes da matrícula.");
  return lines.join("\n");
};