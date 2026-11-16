export interface UnicredOption { parcelas: number; valor: number }

export const formatBRL = (v: number): string =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Ordena por nº de parcelas, remove duplicadas e inválidas */
export const normalizeOptions = (opts: UnicredOption[]): UnicredOption[] => {
  const map = new Map<number, number>();
  for (const o of opts) {
    if (Number.isInteger(o.parcelas) && o.parcelas > 0 && o.valor > 0) map.set(o.parcelas, o.valor);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([parcelas, valor]) => ({ parcelas, valor }));
};

export const unicredFinancingMessage = (args: {
  courseName: string;
  workload: string;
  year: number | string;
  cashValue: number | null;
  options: UnicredOption[];
  showTotal?: boolean;
}): string => {
  const opts = normalizeOptions(args.options);
  const lines = [
    `*${args.courseName.toUpperCase()} – NEXUS ${args.year}*`,
    `🕒 *Carga Horária:* ${args.workload}`,
    "",
    `💰 *INVESTIMENTO*`,
    "",
    `✔️ *Valor à vista:* ${args.cashValue ? formatBRL(args.cashValue) : "R$ _________"}`,
    "",
    `🏦 Agora contamos com o *Financiamento Estudantil Unicred*, parceira oficial da Nexus — uma condição *especial e exclusiva para alunos Nexus*!`,
    "",
    `📅 O primeiro pagamento pode ser feito em até *30 dias*, com as seguintes opções:`,
    "",
    ...(opts.length ? opts.map((o) => `( ) ${o.parcelas}x de ${formatBRL(o.valor)}${args.showTotal ? ` (total: ${formatBRL(Math.round(o.parcelas * o.valor * 100) / 100)})` : ""}`) : ["( ) ___x de R$ _________"]),
    "",
    `🤝 São condições *diferenciadas da parceria Nexus + Unicred*, disponíveis só para quem é nosso aluno.`,
    "",
    `Podemos prosseguir com a reserva da sua vaga? 😊`,
  ];
  return lines.join("\n");
};
