// Sync 5 specific tabs from a private Google Sheet using a Google Service Account.
// Tabs: "São Paulo", "Brasília", "GR base", "calendário SP", "calendário DF".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- helpers ----------
const norm = (s: string) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritics
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "") // zero-width chars
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

// Strip ALL punctuation/whitespace for structural comparison.
const stripAll = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

const slugify = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const findIdx = (header: string[], candidates: string[]): number => {
  const hn = header.map(norm);
  for (const c of candidates) {
    const cn = norm(c);
    const i = hn.findIndex((h) => h === cn || h.includes(cn));
    if (i >= 0) return i;
  }
  return -1;
};

const parseDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const yyyy = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${yyyy}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return null;
};

// Filtro de ano-alvo: a sincronização só processa registros do ano corrente
// de operação (2026). Datas de outros anos ou nulas são descartadas.
const TARGET_YEAR = "2026";
const isTargetYear = (date: string | null): boolean =>
  !!date && date.startsWith(`${TARGET_YEAR}-`);

const parseInteger = (v: any): number => {
  if (v == null || v === "") return 0;
  const m = String(v).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

const parseAmount = (v: any): number | null => {
  if (v == null || v === "") return null;
  const s = String(v).replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const extractSheetId = (url: string): string | null => {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
};

// ---------- Google Service Account auth ----------
const pemToBinary = (pem: string): Uint8Array => {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const getGoogleAccessToken = async (saJson: string): Promise<string> => {
  const sa = JSON.parse(saJson);
  const keyData = pemToBinary(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = getNumericDate(0);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: getNumericDate(3600),
    },
    cryptoKey,
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao obter token Google: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
};

// ---------- Google Sheets API ----------
type SheetMeta = { title: string; sheetId: number };

const getSheetMetadata = async (
  spreadsheetId: string,
  accessToken: string,
): Promise<SheetMeta[]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Falha ao listar abas: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.sheets || []).map((s: any) => ({
    title: s.properties.title as string,
    sheetId: s.properties.sheetId as number,
  }));
};

const getSheetValues = async (
  spreadsheetId: string,
  tabTitle: string,
  accessToken: string,
): Promise<string[][]> => {
  const range = encodeURIComponent(`${tabTitle}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Falha ao ler aba ${tabTitle}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.values || []) as string[][];
};

// ---------- tab matching ----------
// Strategy: 3 passes, strict to loose, but never an unbounded `includes`.
// Pass 1: exact equality after normalization (lower + diacritics + whitespace).
// Pass 2: equality after stripping ALL punctuation/whitespace.
// Pass 3: prefix overlap on stripped form, requiring at least 12 shared chars.
const matchTab = (tabs: SheetMeta[], wanted: string[]): SheetMeta | null => {
  // Pass 1
  for (const w of wanted) {
    const wn = norm(w);
    const t = tabs.find((x) => norm(x.title) === wn);
    if (t) {
      console.log(`[matchTab] exact match: alias="${w}" -> tab="${t.title}"`);
      return t;
    }
  }
  // Pass 2
  for (const w of wanted) {
    const ws = stripAll(w);
    const t = tabs.find((x) => stripAll(x.title) === ws);
    if (t) {
      console.log(`[matchTab] stripped match: alias="${w}" -> tab="${t.title}"`);
      return t;
    }
  }
  // Pass 3 — restricted prefix overlap
  for (const w of wanted) {
    const ws = stripAll(w);
    if (ws.length < 12) continue;
    const t = tabs.find((x) => {
      const ts = stripAll(x.title);
      if (ts.length < 12) return false;
      const overlap = Math.min(ts.length, ws.length);
      if (overlap < 12) return false;
      return ts.startsWith(ws) || ws.startsWith(ts);
    });
    if (t) {
      console.log(`[matchTab] prefix match: alias="${w}" -> tab="${t.title}"`);
      return t;
    }
  }
  console.log(`[matchTab] NO match for aliases=${JSON.stringify(wanted)}`);
  return null;
};

// ---------- per-tab processors ----------
type Course = { id: string; name: string; unit: "sao_paulo" | "brasilia"; slug: string | null; mnemonic: string | null };

// Coletor global de turmas órfãs (turmas que não casaram com nenhum curso)
type UnmatchedEntry = { prefix: string; quantidade: number; exemplo: string; unit: string };
const unmatchedTurmas = new Map<string, UnmatchedEntry>();
const matchFailLogged = new Set<string>(); // log uma amostra por prefixo

const recordUnmatched = (
  turma: string,
  prefix: string,
  unit: string,
  courses: Course[],
) => {
  if (!prefix) return;
  const cur = unmatchedTurmas.get(prefix);
  if (cur) {
    cur.quantidade += 1;
  } else {
    unmatchedTurmas.set(prefix, { prefix, quantidade: 1, exemplo: turma, unit });
  }
  if (!matchFailLogged.has(prefix)) {
    matchFailLogged.add(prefix);
    const anyCourse = courses.find(
      (c) => slugMnemonic(c.slug) === prefix || (c.mnemonic && norm(c.mnemonic).replace(/\s+/g, "") === prefix),
    );
    console.log(
      `[match-fail] turma="${turma}" prefix="${prefix}" derivedUnit="${unit}" anyCourseWithPrefix=${anyCourse ? `${anyCourse.slug} (${anyCourse.unit})` : "NONE"}`,
    );
  }
};
const findCourse = (
  courses: Course[],
  name: string,
  unitHint?: string,
): Course | undefined => {
  if (!name) return undefined;
  const ns = slugify(name);
  const matches = courses.filter((c) => {
    const cs = slugify(c.name);
    return cs === ns || cs.includes(ns) || ns.includes(cs);
  });
  if (matches.length === 0) return undefined;
  if (unitHint) {
    const inUnit = matches.find((c) => c.unit === unitHint);
    if (inUnit) return inUnit;
  }
  return matches[0];
};

// Extrai o MNEMONICO do código de TURMA (tudo antes do primeiro ponto),
// normaliza para comparação: minúsculo, sem acentos, sem espaços.
// Trata o sufixo de unidade paulista ".SP" no FINAL do código antes de
// extrair o prefixo, para que "CM US MAMA.SP" e "CM US MAMA.2601.1"
// resolvam o mesmo prefixo raiz ("cmusmama").
// Ex.: "CM US MESQ.2601.1"     -> "cmusmesq"
//      "CM US CAVF.SP.2607.1"  -> "cmuscavf"
//      "CM US MAMA.SP"         -> "cmusmama"
const turmaPrefix = (turma: string): string => {
  const cleaned = (turma || "").replace(/\.SP$/i, "");
  const head = cleaned.split(".")[0] || "";
  return norm(head).replace(/\s+/g, "");
};

// Deriva unidade do código de TURMA. Padrão: [MNEMONICO].[AAMM].[N]
// Quando há "SP" entre o mnemônico e o ano (3 ou mais segmentos),
// é São Paulo. Caso contrário, Brasília (DF).
const unitFromTurma = (turma: string, fallback: "sao_paulo" | "brasilia"): "sao_paulo" | "brasilia" => {
  const parts = (turma || "").split(".");
  if (parts.length < 3) return fallback; // sem token de unidade explícito => DF
  const seg = norm(parts[1]).replace(/\s+/g, "");
  if (seg === "sp") return "sao_paulo";
  if (seg === "df" || seg === "bsb") return "brasilia";
  // 3 segmentos mas o 2º não é unidade => fallback
  return fallback;
};

// Extrai o "mnemônico normalizado" do slug do curso, removendo o sufixo
// de unidade (-sp/-bsb/-df) e qualquer hash de 4 chars no fim (ex.: "-ul9a").
// Ex.: "cm-us-cavf-bsb"   -> "cmuscavf"
//      "cm-us-mama-sp"    -> "cmusmama"
//      "cm-us-pedi-quadril-sp" -> "cmuspediquadril"
// Extrai o "mnemônico normalizado" do slug do curso, removendo apenas o
// sufixo de unidade (-sp/-bsb/-df). NÃO remove blocos curtos com dígitos no
// fim, pois esses fazem parte de mnemônicos legítimos (ex.: "mor1", "ped1",
// "t10" em pós-graduações).
// Ex.: "cm-us-cavf-bsb"        -> "cmuscavf"
//      "cm-us-mama-sp"          -> "cmusmama"
//      "cm-us-pedi-quadril-sp"  -> "cmuspediquadril"
//      "cm-us-mor1-bsb"         -> "cmusmor1"  (preservado)
//      "cm-us-ped1-sp"          -> "cmusped1"  (preservado)
const slugMnemonic = (slug: string | null | undefined): string => {
  if (!slug) return "";
  const parts = norm(slug).split("-").filter(Boolean);
  // remove sufixos de unidade conhecidos no fim
  while (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last === "sp" || last === "bsb" || last === "df") {
      parts.pop();
      continue;
    }
    break;
  }
  return parts.join("");
};

// Match por igualdade exata do MNEMONICO (prefixo da TURMA == mnemônico do slug),
// preferindo cursos da mesma unidade. Usa courses.mnemonic se preenchido.
const normMnemonic = (m: string | null | undefined): string =>
  norm(m || "").replace(/\s+/g, "");

const findCourseByTurma = (
  courses: Course[],
  turma: string,
  unit: "sao_paulo" | "brasilia",
): Course | undefined => {
  const prefix = turmaPrefix(turma);
  if (!prefix) return undefined;

  // 1) match por mnemonic explícito (prioridade) + mesma unidade
  const byMnemonic = courses.find(
    (c) => c.unit === unit && c.mnemonic && normMnemonic(c.mnemonic) === prefix,
  );
  if (byMnemonic) return byMnemonic;

  // 2) match por mnemonic explícito em qualquer unidade
  const byMnemonicAny = courses.find(
    (c) => c.mnemonic && normMnemonic(c.mnemonic) === prefix,
  );
  if (byMnemonicAny) return byMnemonicAny;

  // 3) match exato por slug + mesma unidade
  const exact = courses.find(
    (c) => c.unit === unit && slugMnemonic(c.slug) === prefix,
  );
  if (exact) return exact;

  // 4) match exato por slug em qualquer unidade
  const anyUnit = courses.find((c) => slugMnemonic(c.slug) === prefix);
  if (anyUnit) return anyUnit;

  // 5) fallback por nome: mnemônico do início do nome (ex.: "CM US CAVF: ...")
  const byName = courses.find((c) => {
    if (c.unit !== unit) return false;
    const head = norm(c.name).split(":")[0] || "";
    return head.replace(/\s+/g, "") === prefix;
  });
  return byName;
};

interface UpsertCounters { inserted: number; updated: number; errors: string[] }

// Generic batched upsert with in-batch dedupe by conflict key.
// Postgres can't update the same row twice in one INSERT ... ON CONFLICT,
// so we keep the LAST occurrence per key and split into chunks.
const BATCH_SIZE = 300;
const batchUpsert = async (
  supabase: any,
  table: string,
  records: any[],
  conflictCols: string,
  counters: UpsertCounters,
  label: string,
): Promise<void> => {
  if (records.length === 0) return;
  const keys = conflictCols.split(",").map((k) => k.trim());
  const dedupMap = new Map<string, any>();
  for (const r of records) {
    const key = keys.map((k) => String(r[k] ?? "")).join("||");
    dedupMap.set(key, r);
  }
  const deduped = Array.from(dedupMap.values());
  console.log(`[batchUpsert] ${label}: ${records.length} -> ${deduped.length} after dedupe, batches of ${BATCH_SIZE}`);
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const chunk = deduped.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictCols, ignoreDuplicates: false });
    if (error) {
      counters.errors.push(`${label} lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      console.error(`[batchUpsert] ${label} batch ${i}: ${error.message}`);
    } else {
      counters.inserted += chunk.length;
    }
  }
};

// Window collected from enrollment rows: per unit + dates + course
type WindowRow = {
  unit: "sao_paulo" | "brasilia";
  course_id: string;
  course_name: string;
  start_date: string;
  end_date: string;
  class_label: string | null;
};

// Estrutura especial das abas (DF/SP)TURMAS COM MATRICULADOS E PRÉ:
// - Linha 0: cabeçalhos de seção ("ALUNOS PAGOS" / "ALUNOS PRÉ MATRICULADOS")
// - Linha 1: cabeçalho de colunas, repetido para PAGOS (esquerda) e PRÉ (direita)
//   Mês(INICIO) | TURMA | NOME | TELEFONE | EMAIL | ESPECIALIDADE | UF |
//   VENDEDOR | CRM | JALECO | PARCELAS | STATUS DO ALUNO | 1º PAGAMENTO PAGTO |
//   VALOR PAGO | STATUS APÓS 2º BOLETO | PARCELAMENTO | INFORME SECRETARIA
// - Linha 2+: dados dos alunos. A coluna TURMA contém o código/mnemônico do curso.
//
// Cada linha de aluno conta como 1 matriculado. Agregamos por (TURMA, Mês INICIO)
// e gravamos em enrollments_by_class com student_count = nº de alunos da turma,
// somando PAGOS + PRÉ (o tipo é diferenciado pelos paid_students separadamente).
const processEnrollmentsTab = async (
  supabase: any,
  userId: string,
  unit: "sao_paulo" | "brasilia",
  values: string[][],
  tabTitle: string,
  courses: Course[],
  windows: WindowRow[],
): Promise<UpsertCounters> => {
  const c: UpsertCounters = { inserted: 0, updated: 0, errors: [] };
  if (values.length < 3) {
    console.log(`[processEnrollmentsTab] ${tabTitle}: too few rows (${values.length})`);
    return c;
  }

  // Header é a LINHA 2 (índice 1)
  const header = values[1];
  const headerNorm = header.map((h) => norm(h || ""));

  // Encontrar índices do PRIMEIRO e SEGUNDO "TURMA" para separar as duas seções
  const turmaIdxs: number[] = [];
  for (let i = 0; i < headerNorm.length; i++) {
    if (headerNorm[i] === "turma") turmaIdxs.push(i);
  }

  if (turmaIdxs.length === 0) {
    c.errors.push(`Aba "${tabTitle}": coluna TURMA não encontrada na linha 2`);
    console.log(`[processEnrollmentsTab] ${tabTitle}: no TURMA column. Header sample=${JSON.stringify(header.slice(0, 30))}`);
    return c;
  }

  const turmaPagos = turmaIdxs[0];
  const turmaPre = turmaIdxs.length >= 2 ? turmaIdxs[1] : -1;
  // Limite da seção PAGOS: começa em 0, termina onde começa a PRÉ
  const fimPagos = turmaPre >= 0 ? turmaPre : header.length;

  console.log(`[processEnrollmentsTab] ${tabTitle}: header on row 2, TURMA cols=[${turmaIdxs.join(",")}], pagos=[0..${fimPagos}), pre=[${turmaPre}..${header.length})`);

  // Helper para localizar coluna dentro de uma janela [start, end)
  const findInRange = (cands: string[], start: number, end: number): number => {
    const candsN = cands.map(norm);
    for (let i = start; i < end; i++) {
      const h = headerNorm[i];
      if (!h) continue;
      if (candsN.some((cn) => h === cn || h.includes(cn))) return i;
    }
    return -1;
  };

  // Índice das colunas relevantes em cada seção. mesFim é opcional: nem
  // toda planilha tem a coluna de término na seção PAGOS/PRÉ. Quando existir,
  // usamos para popular class_end_date.
  const buildSection = (start: number, end: number) => ({
    turma: findInRange(["turma"], start, end),
    nome: findInRange(["nome"], start, end),
    mesInicio: findInRange(["mes(inicio)", "mes inicio", "mês(inicio)", "mês inicio", "inicio", "início", "mes", "mês"], start, end),
    mesFim: findInRange(["mes(fim)", "mes fim", "mês(fim)", "mês fim", "fim", "termino", "término", "data fim", "data termino", "data término", "end"], start, end),
  });

  const secPagos = buildSection(0, fimPagos);
  const secPre = turmaPre >= 0 ? buildSection(turmaPre, header.length) : null;

  console.log(`[processEnrollmentsTab] ${tabTitle}: secPagos=${JSON.stringify(secPagos)} secPre=${JSON.stringify(secPre)}`);

  // Agregar contagem por (turma_code, mes_inicio) — uma linha por aluno
  type Agg = { count: number; firstRow: number; mesFim: string };
  const agg = new Map<string, Agg>();
  // Guarda o nome original da turma para preservar capitalização
  const turmaDisplay = new Map<string, string>();

  const eatRow = (
    row: string[],
    section: { turma: number; nome: number; mesInicio: number; mesFim: number },
    r: number,
  ) => {
    if (section.turma < 0) return;
    const turmaCode = (row[section.turma] || "").trim();
    if (!turmaCode) return;
    const nome = section.nome >= 0 ? (row[section.nome] || "").trim() : "";
    if (!nome) return; // só conta se houver aluno
    const mes = section.mesInicio >= 0 ? (row[section.mesInicio] || "").trim() : "";
    const fim = section.mesFim >= 0 ? (row[section.mesFim] || "").trim() : "";
    const key = `${norm(turmaCode)}||${norm(mes)}`;
    const cur = agg.get(key);
    if (cur) {
      cur.count += 1;
      // preserva primeiro fim não-vazio
      if (!cur.mesFim && fim) cur.mesFim = fim;
    } else {
      agg.set(key, { count: 1, firstRow: r + 1, mesFim: fim });
      turmaDisplay.set(key, turmaCode);
    }
  };

  for (let r = 2; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    eatRow(row, secPagos, r);
    if (secPre) eatRow(row, secPre, r);
  }

  console.log(`[processEnrollmentsTab] ${tabTitle}: aggregated ${agg.size} (turma, mes) groups`);

  const records: any[] = [];
  const now = new Date().toISOString();
  let sampleLogged = 0;
  for (const [key, { count, firstRow, mesFim }] of agg.entries()) {
    const turmaCode = turmaDisplay.get(key) || "";
    const mes = key.split("||")[1] || "";
    const start = parseDate(mes);
    const end = mesFim ? parseDate(mesFim) : null;
    // Filtro de ano: matrículas exigem data de início; nulas ou de outros anos são puladas.
    if (!isTargetYear(start)) continue;
    const matched = findCourseByTurma(courses, turmaCode, unit);
    if (!matched) {
      recordUnmatched(turmaCode, turmaPrefix(turmaCode), unit, courses);
    }
    if (sampleLogged < 3) {
      console.log(`[processEnrollmentsTab] ${tabTitle} sample: turma="${turmaCode}" prefix="${turmaPrefix(turmaCode)}" course_id=${matched?.id ?? "NULL"} slug=${matched?.slug ?? "—"} start=${start} end=${end}`);
      sampleLogged++;
    }
    records.push({
      user_id: userId,
      unit,
      course_id: matched?.id ?? null,
      course_name: matched?.name || turmaCode,
      class_label: turmaCode || null,
      class_start_date: start,
      class_end_date: end,
      student_count: count,
      source_sheet: tabTitle,
      source_row: firstRow,
      synced_at: now,
    });
    if (matched && start) {
      windows.push({
        unit,
        course_id: matched.id,
        course_name: matched.name,
        start_date: start,
        end_date: end || start,
        class_label: turmaCode || null,
      });
    }
  }

  await batchUpsert(
    supabase,
    "enrollments_by_class",
    records,
    "user_id,unit,course_name,class_label,class_start_date",
    c,
    `enrollments ${tabTitle}`,
  );
  console.log(`[processEnrollmentsTab] ${tabTitle}: done, ${records.length} grupos -> inserted=${c.inserted}, errors=${c.errors.length}`);
  return c;
};

const processPaidStudentsTab = async (
  supabase: any,
  userId: string,
  values: string[][],
  tabTitle: string,
  courses: Course[],
): Promise<UpsertCounters> => {
  const c: UpsertCounters = { inserted: 0, updated: 0, errors: [] };
  if (values.length < 2) return c;
  const header = values[0];
  const headerN = header.map((h) => norm(h || ""));

  // Header detection STRICT: campos comuns precisam ser exatos (não substring),
  // para não confundir "STATUS DO ALUNO" com "ALUNO" ou "STATUS".
  const exactIdx = (cands: string[]): number => {
    const cs = cands.map(norm);
    for (let i = 0; i < headerN.length; i++) {
      if (cs.includes(headerN[i])) return i;
    }
    return -1;
  };
  const containsIdx = (cands: string[], reject: string[] = []): number => {
    const cs = cands.map(norm);
    const rj = reject.map(norm);
    for (let i = 0; i < headerN.length; i++) {
      const h = headerN[i];
      if (!h) continue;
      if (rj.some((r) => h.includes(r))) continue;
      if (cs.some((cn) => h === cn || h.includes(cn))) return i;
    }
    return -1;
  };

  // ALUNO/NOME — exigir match exato e rejeitar "status do aluno"
  let idxName = exactIdx(["aluno", "nome", "nome do aluno", "participante", "student"]);
  if (idxName < 0) idxName = containsIdx(["nome do aluno", "nome aluno"], ["status"]);
  // STATUS — preferir "status do aluno"
  let idxStatus = exactIdx(["status do aluno", "status aluno"]);
  if (idxStatus < 0) idxStatus = containsIdx(["status do aluno"]);
  if (idxStatus < 0) idxStatus = exactIdx(["status"]);

  const idxCourse = containsIdx(["curso", "course"], ["status", "valor"]);
  const idxClass = exactIdx(["turma", "class"]);
  const idxContract = containsIdx(["contrato", "contract"]);
  const idxAmount = containsIdx(["valor pago", "valor", "amount"]);
  const idxPayDate = containsIdx(["1º pagamento", "1 pagamento", "data pagamento", "data pago", "pagto"]);
  const idxStart = containsIdx(["mes(inicio)", "mes inicio", "mês(inicio)", "mês inicio", "inicio", "início", "start"], ["status"]);
  const idxEmail = containsIdx(["email", "e-mail"]);
  const idxPhone = containsIdx(["telefone", "celular", "whatsapp", "phone"]);
  const idxNotes = containsIdx(["informe secretaria", "obs", "observa", "notes"]);

  if (idxName < 0 || idxStatus < 0 || idxClass < 0) {
    c.errors.push(`Aba "${tabTitle}": colunas Nome/Status/Turma não encontradas`);
    console.log(`[processPaidStudentsTab] ${tabTitle}: header miss idxName=${idxName} idxStatus=${idxStatus} idxClass=${idxClass}. headerN sample=${JSON.stringify(headerN.slice(0, 30))}`);
    return c;
  }
  console.log(`[processPaidStudentsTab] ${tabTitle}: ${values.length - 1} rows | idxName=${idxName} idxStatus=${idxStatus} idxClass=${idxClass} idxCourse=${idxCourse}`);

  const records: any[] = [];
  const now = new Date().toISOString();
  let sampleLogged = 0;
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    const status = (row[idxStatus] || "").trim();
    const statusN = norm(status);
    // Aceita qualquer variação de "Pago": "PAGO", "1.PAGO", "1 PAGO",
    // "1- PAGO", "1º Pago", "Pago integral", etc. Rejeita variações
    // negativas como "não pago" / "nao pago".
    if (!statusN.includes("pago")) continue;
    if (/\bnao\s+pago\b/.test(statusN)) continue;
    const studentName = (row[idxName] || "").trim();
    if (!studentName) continue;
    // Sanity: rejeita lixo conhecido como "1.PAGO" ou datas no campo nome
    if (/^\d+(\.|\s)?pago$/i.test(studentName) || /^\d{2}\/\d{2}\/\d{4}$/.test(studentName)) continue;

    const classLabel = (row[idxClass] || "").trim();
    const courseNameRaw = idxCourse >= 0 ? (row[idxCourse] || "").trim() : "";
    // Derivar unit a partir da TURMA; fallback DF (DF é o padrão histórico,
    // SP sempre vem marcado explicitamente com .SP. no código da turma)
    const derivedUnit = unitFromTurma(classLabel, "brasilia");
    const matched = classLabel ? findCourseByTurma(courses, classLabel, derivedUnit) : undefined;
    if (classLabel && !matched) {
      recordUnmatched(classLabel, turmaPrefix(classLabel), derivedUnit, courses);
    }

    if (sampleLogged < 3) {
      console.log(`[processPaidStudentsTab] ${tabTitle} sample: name="${studentName}" turma="${classLabel}" unit=${derivedUnit} course_id=${matched?.id ?? "NULL"}`);
      sampleLogged++;
    }

    records.push({
      user_id: userId,
      student_name: studentName,
      student_email: idxEmail >= 0 ? (row[idxEmail] || "").trim() || null : null,
      student_phone: idxPhone >= 0 ? (row[idxPhone] || "").trim() || null : null,
      course_id: matched?.id ?? null,
      course_name: matched?.name || courseNameRaw || null,
      class_label: classLabel || null,
      class_start_date: idxStart >= 0 ? parseDate(row[idxStart]) : null,
      payment_status: status || "1.PAGO",
      contract_status: idxContract >= 0 ? (row[idxContract] || "").trim() || null : null,
      amount: idxAmount >= 0 ? parseAmount(row[idxAmount]) : null,
      payment_date: idxPayDate >= 0 ? parseDate(row[idxPayDate]) : null,
      source_sheet: tabTitle,
      source_row: r + 1,
      notes: idxNotes >= 0 ? (row[idxNotes] || "").trim() || null : null,
      synced_at: now,
    });
  }
  await batchUpsert(
    supabase,
    "paid_students",
    records,
    "user_id,student_name,course_name,class_label",
    c,
    `paid ${tabTitle}`,
  );
  console.log(`[processPaidStudentsTab] ${tabTitle}: done, inserted=${c.inserted}, errors=${c.errors.length}`);
  return c;
};

const processCalendarTab = async (
  supabase: any,
  userId: string,
  unit: "sao_paulo" | "brasilia",
  values: string[][],
  tabTitle: string,
  courses: Course[],
): Promise<UpsertCounters> => {
  const c: UpsertCounters = { inserted: 0, updated: 0, errors: [] };
  if (values.length < 2) return c;
  const header = values[0];
  const idxCourse = findIdx(header, ["curso", "course"]);
  const idxLabel = findIdx(header, ["turma", "evento", "modulo", "módulo", "etapa"]);
  const idxStart = findIdx(header, ["inicio", "início", "start", "data inicio", "data"]);
  const idxEnd = findIdx(header, ["fim", "termino", "término", "end", "data fim"]);
  const idxLocation = findIdx(header, ["local", "location", "endereco", "endereço"]);
  const idxCoord = findIdx(header, ["coordenador", "coordinator", "professor", "responsavel", "responsável"]);
  const idxNotes = findIdx(header, ["obs", "observa", "notes"]);
  if (idxCourse < 0) {
    c.errors.push(`Aba "${tabTitle}": coluna Curso não encontrada`);
    return c;
  }
  console.log(`[processCalendarTab] ${tabTitle}: ${values.length - 1} rows`);
  const records: any[] = [];
  const now = new Date().toISOString();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    const courseName = (row[idxCourse] || "").trim();
    if (!courseName) continue;
    const matched = findCourse(courses, courseName, unit);
    records.push({
      user_id: userId,
      unit,
      course_id: matched?.id ?? null,
      course_name: courseName,
      event_label: idxLabel >= 0 ? (row[idxLabel] || "").trim() || null : null,
      start_date: idxStart >= 0 ? parseDate(row[idxStart]) : null,
      end_date: idxEnd >= 0 ? parseDate(row[idxEnd]) : null,
      location: idxLocation >= 0 ? (row[idxLocation] || "").trim() || null : null,
      coordinator: idxCoord >= 0 ? (row[idxCoord] || "").trim() || null : null,
      source_sheet: tabTitle,
      source_row: r + 1,
      notes: idxNotes >= 0 ? (row[idxNotes] || "").trim() || null : null,
      synced_at: now,
    });
  }
  await batchUpsert(
    supabase,
    "calendar_events",
    records,
    "user_id,unit,course_name,event_label,start_date",
    c,
    `calendar ${tabTitle}`,
  );
  console.log(`[processCalendarTab] ${tabTitle}: done, inserted=${c.inserted}, errors=${c.errors.length}`);
  return c;
};

// ---------- class_groups sync ----------
type ComboRule = {
  id: string;
  name: string;
  combo_course_id: string;
  trigger_course_ids: string[];
  combo_display_mode: "individual" | "combo_only" | "both";
  individuals_display_mode: "individual" | "combo_only" | "both";
  active: boolean;
};

const datesOverlap = (
  aStart: string, aEnd: string, bStart: string, bEnd: string,
): boolean => aStart <= bEnd && bStart <= aEnd;

const syncClassGroups = async (
  supabase: any,
  windows: WindowRow[],
  courses: Course[],
): Promise<{ groups_created: number; groups_updated: number; links_upserted: number; combos_applied: number; errors: string[] }> => {
  const stats = { groups_created: 0, groups_updated: 0, links_upserted: 0, combos_applied: 0, errors: [] as string[] };

  // 1) Group windows by (unit, start, end)
  const bucketMap = new Map<string, WindowRow[]>();
  for (const w of windows) {
    const key = `${w.unit}|${w.start_date}|${w.end_date}`;
    const arr = bucketMap.get(key) || [];
    arr.push(w);
    bucketMap.set(key, arr);
  }

  // 2) Load existing groups + active combo rules
  const [groupsRes, rulesRes, linksRes] = await Promise.all([
    supabase.from("class_groups").select("id, unit, start_date, end_date"),
    supabase.from("course_combo_rules").select("*").eq("active", true),
    supabase.from("class_group_courses").select("group_id, course_id"),
  ]);
  const existingGroups = (groupsRes.data || []) as Array<{
    id: string; unit: string; start_date: string; end_date: string;
  }>;
  const rules = (rulesRes.data || []) as ComboRule[];
  const existingLinkSet = new Set(
    ((linksRes.data || []) as Array<{ group_id: string; course_id: string }>)
      .map((l) => `${l.group_id}|${l.course_id}`),
  );

  const groupKey = (unit: string, s: string, e: string) => `${unit}|${s}|${e}`;
  const groupMap = new Map<string, string>();
  for (const g of existingGroups) {
    groupMap.set(groupKey(g.unit, g.start_date, g.end_date), g.id);
  }

  // 3) Upsert each bucket as a class_group + link courses
  for (const [key, rows] of bucketMap.entries()) {
    const [unit, start, end] = key.split("|");
    let groupId = groupMap.get(key);

    if (!groupId) {
      const { data: ins, error: insErr } = await supabase
        .from("class_groups")
        .insert({ unit, start_date: start, end_date: end, status: "proxima" })
        .select("id")
        .single();
      if (insErr || !ins) {
        stats.errors.push(`Janela ${key}: ${insErr?.message || "erro ao criar"}`);
        continue;
      }
      groupId = ins.id;
      groupMap.set(key, groupId);
      stats.groups_created++;
    } else {
      stats.groups_updated++;
    }

    // Link each unique course in this bucket
    const uniqueCourses = Array.from(new Set(rows.map((r) => r.course_id)));
    for (const courseId of uniqueCourses) {
      if (existingLinkSet.has(`${groupId}|${courseId}`)) continue;
      const { error: linkErr } = await supabase
        .from("class_group_courses")
        .insert({
          group_id: groupId,
          course_id: courseId,
          display_mode: "individual",
          start_date: start,
          end_date: end,
        });
      if (linkErr) {
        // ignore unique-violation noise
        if (!String(linkErr.message).toLowerCase().includes("duplicate")) {
          stats.errors.push(`Vínculo ${groupId}/${courseId}: ${linkErr.message}`);
        }
      } else {
        stats.links_upserted++;
        existingLinkSet.add(`${groupId}|${courseId}`);
      }
    }
  }

  // 4) Apply combo rules: for each rule, find groups (same unit) where all trigger
  // courses are linked. Add the combo course + adjust display_mode.
  for (const rule of rules) {
    const comboCourse = courses.find((c) => c.id === rule.combo_course_id);
    if (!comboCourse) continue;

    // re-load links per group to know who's there
    const { data: allLinks } = await supabase
      .from("class_group_courses")
      .select("group_id, course_id, display_mode");
    const linksByGroup = new Map<string, Array<{ course_id: string; display_mode: string }>>();
    for (const l of (allLinks || []) as any[]) {
      const arr = linksByGroup.get(l.group_id) || [];
      arr.push(l);
      linksByGroup.set(l.group_id, arr);
    }

    for (const g of existingGroups.concat(
      Array.from(groupMap.entries())
        .filter(([k]) => !existingGroups.some((eg) => groupKey(eg.unit, eg.start_date, eg.end_date) === k))
        .map(([k, id]) => {
          const [unit, s, e] = k.split("|");
          return { id, unit, start_date: s, end_date: e };
        }),
    )) {
      if (g.unit !== comboCourse.unit) continue;
      const links = linksByGroup.get(g.id) || [];
      const linkedIds = new Set(links.map((l) => l.course_id));
      const allTriggersPresent = rule.trigger_course_ids.every((tid) => linkedIds.has(tid));
      if (!allTriggersPresent) continue;

      // Add combo course if not present
      if (!linkedIds.has(rule.combo_course_id)) {
        const { error: comboErr } = await supabase
          .from("class_group_courses")
          .insert({
            group_id: g.id,
            course_id: rule.combo_course_id,
            display_mode: rule.combo_display_mode,
            start_date: g.start_date,
            end_date: g.end_date,
            notes: `Auto: regra "${rule.name}"`,
          });
        if (!comboErr) stats.combos_applied++;
        else if (!String(comboErr.message).toLowerCase().includes("duplicate")) {
          stats.errors.push(`Combo ${rule.name} em ${g.id}: ${comboErr.message}`);
        }
      }

      // Update individual triggers' display_mode
      for (const tid of rule.trigger_course_ids) {
        const link = links.find((l) => l.course_id === tid);
        if (link && link.display_mode !== rule.individuals_display_mode) {
          await supabase
            .from("class_group_courses")
            .update({ display_mode: rule.individuals_display_mode })
            .eq("group_id", g.id)
            .eq("course_id", tid);
        }
      }
    }
  }

  return stats;
};

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Load sheet URL from sheet_config
    const { data: cfg } = await supabase
      .from("sheet_config").select("sheet_url").eq("user_id", userId).maybeSingle();
    const sheetUrl = cfg?.sheet_url;
    if (!sheetUrl) {
      return new Response(JSON.stringify({ error: "Nenhuma planilha configurada em /settings" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const spreadsheetId = extractSheetId(sheetUrl);
    if (!spreadsheetId) {
      return new Response(JSON.stringify({ error: "URL inválida do Google Sheets" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) {
      return new Response(JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_JSON não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getGoogleAccessToken(saJson);
    const tabs = await getSheetMetadata(spreadsheetId, accessToken);

    const { data: coursesData } = await supabase
      .from("courses").select("id, name, unit, slug, mnemonic");
    const courses = (coursesData || []) as Course[];

    // Reset coletores globais por execução
    unmatchedTurmas.clear();
    matchFailLogged.clear();

    const result: Record<string, any> = {
      tabs_found: tabs.map((t) => t.title),
      processed: {} as Record<string, UpsertCounters>,
      missing_tabs: [] as string[],
    };

    const windows: WindowRow[] = [];

    // Apenas as 5 abas abaixo são lidas. Qualquer outra aba da planilha é
    // ignorada silenciosamente (não vira erro nem aparece no relatório).
    const targets: { key: string; aliases: string[]; handler: (v: string[][], title: string) => Promise<UpsertCounters> }[] = [
      {
        key: "GR base",
        aliases: [
          "(GR)BASE(PREENCHER AQUI)",
        ],
        handler: (v, t) => processPaidStudentsTab(supabase, userId, v, t, courses),
      },
      {
        key: "Calendário DF",
        aliases: [
          "(DF)CALENDARIO 2026",
          "(DF)CALENDÁRIO 2026",
        ],
        handler: (v, t) => processCalendarTab(supabase, userId, "brasilia", v, t, courses),
      },
      {
        key: "Calendário SP",
        aliases: [
          "(SP)CALENDARIO 2026 SP",
          "(SP)CALENDÁRIO 2026 SP",
        ],
        handler: (v, t) => processCalendarTab(supabase, userId, "sao_paulo", v, t, courses),
      },
      {
        key: "Brasília",
        aliases: [
          "(DF)TURMAS COM MATRICULADOS E PRÉ 2026",
          "(DF)TURMAS COM MATRICULADOS e PRÉ 2026",
          "(DF)TURMAS COM MATRICULADOS E PRE 2026",
        ],
        handler: (v, t) => processEnrollmentsTab(supabase, userId, "brasilia", v, t, courses, windows),
      },
      {
        key: "São Paulo",
        aliases: [
          "(SP)TURMAS COM MATRICULADOS E PRÉ 2026",
          "(SP)TURMAS COM MATRICULADOS e PRÉ 2026",
          "(SP)TURMAS COM MATRICULADOS E PRE 2026",
        ],
        handler: (v, t) => processEnrollmentsTab(supabase, userId, "sao_paulo", v, t, courses, windows),
      },
    ];

    // Log all tab titles found, normalized, to help future debugging.
    console.log(`[sync] tabs_found (${tabs.length}):`, tabs.map((t) => ({ title: t.title, norm: norm(t.title), stripped: stripAll(t.title) })));

    // Track quais titles já foram consumidos para evitar matchear a mesma aba
    // em dois targets (caso aliases se sobreponham por engano).
    const usedTitles = new Set<string>();

    for (const target of targets) {
      console.log(`[sync] >>> start target "${target.key}"`);
      const candidateTabs = tabs.filter((t) => !usedTitles.has(t.title));
      const tab = matchTab(candidateTabs, target.aliases);
      if (!tab) {
        console.log(`[sync] target "${target.key}": NO TAB MATCHED`);
        result.missing_tabs.push(target.key);
        continue;
      }
      usedTitles.add(tab.title);
      try {
        const values = await getSheetValues(spreadsheetId, tab.title, accessToken);
        console.log(`[sync] target "${target.key}" tab="${tab.title}" rows=${values.length}`);
        const c = await target.handler(values, tab.title);
        const onlyHeaderError = c.inserted === 0 && c.errors.length > 0 &&
          c.errors.every((e) => /coluna|colunas/i.test(e) && /não encontrad/i.test(e));
        if (onlyHeaderError) {
          console.log(`[sync] target "${target.key}": skipped (header mismatch)`);
          continue;
        }
        result.processed[target.key] = { tab_title: tab.title, ...c };
        console.log(`[sync] <<< done target "${target.key}" inserted=${c.inserted} errors=${c.errors.length}`);
      } catch (e: any) {
        console.error(`[sync] target "${target.key}" THREW:`, e?.message || e);
        result.processed[target.key] = { tab_title: tab.title, inserted: 0, updated: 0, errors: [e.message] };
      }
    }

    // Abas da planilha que NÃO são nenhuma das 5 esperadas são ignoradas — não
    // entram em result.processed nem em missing_tabs. Listamos apenas para info.
    result.ignored_tabs = tabs
      .map((t) => t.title)
      .filter((title) => !usedTitles.has(title));

    // Sync class_groups + apply combo rules
    try {
      result.class_groups = await syncClassGroups(supabase, windows, courses);
    } catch (e: any) {
      result.class_groups = { error: e?.message || "Erro ao sincronizar janelas" };
    }

    // Lista ordenada de turmas órfãs (mais alunos primeiro)
    result.unmatched_turmas = Array.from(unmatchedTurmas.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 50);
    console.log(`[sync] unmatched_turmas: ${result.unmatched_turmas.length} prefixos órfãos`);

    const summary = {
      ...result,
      synced_at: new Date().toISOString(),
    };
    await supabase.from("sheet_config")
      .update({ last_synced_at: summary.synced_at, last_sync_summary: summary })
      .eq("user_id", userId);

    return new Response(JSON.stringify(summary), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-google-sheets error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
