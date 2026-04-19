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
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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
const matchTab = (tabs: SheetMeta[], wanted: string[]): SheetMeta | null => {
  for (const w of wanted) {
    const wn = norm(w);
    const t = tabs.find((x) => norm(x.title) === wn);
    if (t) return t;
  }
  for (const w of wanted) {
    const wn = norm(w);
    const t = tabs.find((x) => norm(x.title).includes(wn) || wn.includes(norm(x.title)));
    if (t) return t;
  }
  return null;
};

// ---------- per-tab processors ----------
type Course = { id: string; name: string; unit: string };
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

interface UpsertCounters { inserted: number; updated: number; errors: string[] }

const processEnrollmentsTab = async (
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
  const idxClass = findIdx(header, ["turma", "class", "grupo"]);
  const idxStart = findIdx(header, ["inicio", "início", "start", "data inicio"]);
  const idxEnd = findIdx(header, ["fim", "termino", "término", "end", "data fim"]);
  const idxCount = findIdx(header, ["alunos", "matriculados", "qtd", "quantidade", "total", "n alunos"]);
  if (idxCourse < 0 || idxCount < 0) {
    c.errors.push(`Aba "${tabTitle}": colunas Curso/Alunos não encontradas`);
    return c;
  }
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    const courseName = (row[idxCourse] || "").trim();
    if (!courseName) continue;
    const studentCount = parseInteger(row[idxCount]);
    const classLabel = idxClass >= 0 ? (row[idxClass] || "").trim() : null;
    const start = idxStart >= 0 ? parseDate(row[idxStart]) : null;
    const end = idxEnd >= 0 ? parseDate(row[idxEnd]) : null;
    const matched = findCourse(courses, courseName, unit);
    const record = {
      user_id: userId,
      unit,
      course_id: matched?.id ?? null,
      course_name: courseName,
      class_label: classLabel || null,
      class_start_date: start,
      class_end_date: end,
      student_count: studentCount,
      source_sheet: tabTitle,
      source_row: r + 1,
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("enrollments_by_class")
      .upsert(record, {
        onConflict: "user_id,unit,course_name,class_label,class_start_date",
        ignoreDuplicates: false,
      });
    if (error) c.errors.push(`Linha ${r + 1} (${tabTitle}): ${error.message}`);
    else c.inserted++;
  }
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
  const idxName = findIdx(header, ["aluno", "nome", "student", "participante"]);
  const idxCourse = findIdx(header, ["curso", "course"]);
  const idxClass = findIdx(header, ["turma", "class"]);
  const idxStatus = findIdx(header, ["status", "pagamento", "situacao"]);
  const idxContract = findIdx(header, ["contrato", "contract"]);
  const idxAmount = findIdx(header, ["valor", "amount", "preco", "preço"]);
  const idxPayDate = findIdx(header, ["data pagamento", "data pago", "pagamento", "data"]);
  const idxStart = findIdx(header, ["inicio", "início", "start"]);
  const idxEmail = findIdx(header, ["email", "e-mail"]);
  const idxPhone = findIdx(header, ["telefone", "celular", "whatsapp", "phone"]);
  const idxNotes = findIdx(header, ["obs", "observa", "notes"]);
  if (idxName < 0 || idxStatus < 0) {
    c.errors.push(`Aba "${tabTitle}": colunas Aluno/Status não encontradas`);
    return c;
  }
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    const status = (row[idxStatus] || "").trim();
    if (!norm(status).startsWith("1.pago") && !norm(status).startsWith("1 pago")) continue;
    const studentName = (row[idxName] || "").trim();
    if (!studentName) continue;
    const courseName = idxCourse >= 0 ? (row[idxCourse] || "").trim() : null;
    const classLabel = idxClass >= 0 ? (row[idxClass] || "").trim() : null;
    const matched = courseName ? findCourse(courses, courseName) : undefined;
    const record = {
      user_id: userId,
      student_name: studentName,
      student_email: idxEmail >= 0 ? (row[idxEmail] || "").trim() || null : null,
      student_phone: idxPhone >= 0 ? (row[idxPhone] || "").trim() || null : null,
      course_id: matched?.id ?? null,
      course_name: courseName || null,
      class_label: classLabel || null,
      class_start_date: idxStart >= 0 ? parseDate(row[idxStart]) : null,
      payment_status: status || "1.PAGO",
      contract_status: idxContract >= 0 ? (row[idxContract] || "").trim() || null : null,
      amount: idxAmount >= 0 ? parseAmount(row[idxAmount]) : null,
      payment_date: idxPayDate >= 0 ? parseDate(row[idxPayDate]) : null,
      source_sheet: tabTitle,
      source_row: r + 1,
      notes: idxNotes >= 0 ? (row[idxNotes] || "").trim() || null : null,
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("paid_students")
      .upsert(record, {
        onConflict: "user_id,student_name,course_name,class_label",
        ignoreDuplicates: false,
      });
    if (error) c.errors.push(`Linha ${r + 1} (${tabTitle}): ${error.message}`);
    else c.inserted++;
  }
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
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.length === 0) continue;
    const courseName = (row[idxCourse] || "").trim();
    if (!courseName) continue;
    const matched = findCourse(courses, courseName, unit);
    const record = {
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
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("calendar_events")
      .upsert(record, {
        onConflict: "user_id,unit,course_name,event_label,start_date",
        ignoreDuplicates: false,
      });
    if (error) c.errors.push(`Linha ${r + 1} (${tabTitle}): ${error.message}`);
    else c.inserted++;
  }
  return c;
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
      .from("courses").select("id, name, unit");
    const courses = (coursesData || []) as Course[];

    const result: Record<string, any> = {
      tabs_found: tabs.map((t) => t.title),
      processed: {} as Record<string, UpsertCounters>,
      missing_tabs: [] as string[],
    };

    const targets: { key: string; aliases: string[]; handler: (v: string[][], title: string) => Promise<UpsertCounters> }[] = [
      {
        key: "São Paulo",
        aliases: ["sao paulo", "são paulo", "sp", "matriculas sp"],
        handler: (v, t) => processEnrollmentsTab(supabase, userId, "sao_paulo", v, t, courses),
      },
      {
        key: "Brasília",
        aliases: ["brasilia", "brasília", "df", "matriculas df"],
        handler: (v, t) => processEnrollmentsTab(supabase, userId, "brasilia", v, t, courses),
      },
      {
        key: "GR base",
        aliases: ["gr base", "grbase", "base gr", "alunos pagos", "pagos"],
        handler: (v, t) => processPaidStudentsTab(supabase, userId, v, t, courses),
      },
      {
        key: "Calendário SP",
        aliases: ["calendario sp", "calendário sp", "calendario sao paulo", "agenda sp"],
        handler: (v, t) => processCalendarTab(supabase, userId, "sao_paulo", v, t, courses),
      },
      {
        key: "Calendário DF",
        aliases: ["calendario df", "calendário df", "calendario brasilia", "agenda df"],
        handler: (v, t) => processCalendarTab(supabase, userId, "brasilia", v, t, courses),
      },
    ];

    for (const target of targets) {
      const tab = matchTab(tabs, target.aliases);
      if (!tab) {
        result.missing_tabs.push(target.key);
        continue;
      }
      try {
        const values = await getSheetValues(spreadsheetId, tab.title, accessToken);
        const c = await target.handler(values, tab.title);
        result.processed[target.key] = { tab_title: tab.title, ...c };
      } catch (e: any) {
        result.processed[target.key] = { tab_title: tab.title, inserted: 0, updated: 0, errors: [e.message] };
      }
    }

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
