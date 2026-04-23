// Utilitários para parsear códigos de turma da planilha
// Formato esperado: [MNEMONICO].[UNIT?].[AAMM].[NUM]
// Exemplos:
//   "CM PR MIFE.2606.1"     -> { year: 2026, month: 6, num: 1 }
//   "CM US INME.SP.2607.1"  -> { unit: "sp", year: 2026, month: 7, num: 1 }
//   "CM US PED2.2305.1"     -> { year: 2023, month: 5, num: 1 }

export interface ParsedTurma {
  prefix?: string;
  unit?: "sp" | "df" | string;
  year?: number;
  month?: number;
  num?: number;
}

export const parseTurmaCode = (turma?: string | null): ParsedTurma => {
  if (!turma) return {};
  const parts = String(turma).trim().split(".").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return {};

  const result: ParsedTurma = { prefix: parts[0] };

  // Procurar token AAMM (4 dígitos): primeiros 2 = ano (20xx), últimos 2 = mês 01-12
  let yymmIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (/^\d{4}$/.test(p)) {
      const yy = parseInt(p.slice(0, 2), 10);
      const mm = parseInt(p.slice(2, 4), 10);
      if (mm >= 1 && mm <= 12 && yy >= 0 && yy <= 99) {
        result.year = 2000 + yy;
        result.month = mm;
        yymmIdx = i;
        break;
      }
    }
  }

  // Token entre prefix e AAMM (se houver) é a unidade explícita
  if (yymmIdx > 1) {
    const unitToken = parts[1].toLowerCase();
    if (unitToken === "sp" || unitToken === "df") result.unit = unitToken;
  }

  // Número da turma vem após AAMM
  if (yymmIdx >= 0 && parts[yymmIdx + 1] && /^\d+$/.test(parts[yymmIdx + 1])) {
    result.num = parseInt(parts[yymmIdx + 1], 10);
  }

  return result;
};

export const getTurmaYear = (turma?: string | null): number | undefined =>
  parseTurmaCode(turma).year;
