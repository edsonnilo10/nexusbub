import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- helpers ----------
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const slugify = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const findKeyVal = (row: Record<string, any>, candidates: string[]): any => {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const cn = norm(c);
    const k = keys.find((x) => norm(x).includes(cn));
    if (k && row[k] !== "" && row[k] != null) return row[k];
  }
  return null;
};

const parseDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const yyyy = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${yyyy}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return null;
};

const parsePaymentStatus = (v: any): "pendente" | "pago" | "isento" | "cancelado" => {
  const s = norm(String(v ?? ""));
  if (!s) return "pendente";
  if (/(pago|quitad|ok|sim|liquidad)/.test(s)) return "pago";
  if (/(isent|gratuit|cortesia|bols)/.test(s)) return "isento";
  if (/(cancel|desist|reembols)/.test(s)) return "cancelado";
  return "pendente";
};

const parseContractStatus = (v: any): "sem_contrato" | "em_contrato" | "assinado" => {
  const s = norm(String(v ?? ""));
  if (!s) return "sem_contrato";
  if (/(assinad|fechad|concluid|ok)/.test(s)) return "assinado";
  if (/(em\s*contrat|negoc|pendent|enviad|aguard)/.test(s)) return "em_contrato";
  return "sem_contrato";
};

// Parse simple CSV (handles quoted fields with commas + escaped quotes)
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v && v.trim().length));
};

const csvToObjects = (csv: string): Record<string, string>[] => {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
    return o;
  });
};

// Extract spreadsheet ID from a Google Sheets URL
const extractSheetId = (url: string): string | null => {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
};

// Fetch sheet metadata (gid + title for each tab) by parsing the public HTML
const fetchSheetTabs = async (sheetId: string): Promise<{ gid: string; title: string }[]> => {
  // Use the gviz endpoint that lists sheets
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=0`;
  const res = await fetch(url);
  if (!res.ok) {
    // Fallback: just use gid=0
    return [{ gid: "0", title: "Sheet1" }];
  }
  // Try alternate: fetch the published HTML that contains sheet menu
  // Actually, gviz only returns the first tab. Use the metadata feed.
  const metaUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
  const html = await (await fetch(metaUrl)).text();
  const tabs: { gid: string; title: string }[] = [];
  // Look for sheet-button items: id="sheet-button-<gid>" ... >Title<
  const re = /id="sheet-button-(\d+)"[^>]*>(?:<[^>]+>)*([^<]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    tabs.push({ gid: m[1], title: m[2].trim() });
  }
  if (tabs.length === 0) tabs.push({ gid: "0", title: "Sheet1" });
  return tabs;
};

const fetchSheetCSV = async (sheetId: string, gid: string): Promise<string | null> => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.text();
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

    const body = await req.json().catch(() => ({}));
    let sheetUrl: string | undefined = body.sheet_url;

    // If no URL passed, load from sheet_config
    if (!sheetUrl) {
      const { data: cfg } = await supabase
        .from("sheet_config").select("sheet_url").eq("user_id", userId).maybeSingle();
      sheetUrl = cfg?.sheet_url;
    }

    if (!sheetUrl) {
      return new Response(JSON.stringify({ error: "Nenhuma planilha configurada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return new Response(JSON.stringify({ error: "URL inválida do Google Sheets" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all courses (just id + name) with service role bypass via user RLS (user is approved)
    const { data: courses, error: coursesErr } = await supabase
      .from("courses").select("id, name");
    if (coursesErr) throw coursesErr;
    const courseBySlug = new Map<string, { id: string; name: string }>();
    (courses || []).forEach((c) => courseBySlug.set(slugify(c.name), c));

    // Load classes for date matching
    const { data: classes } = await supabase
      .from("course_classes").select("id, course_id, start_date");
    const classKey = (courseId: string, start?: string | null) =>
      `${courseId}::${start || ""}`;
    const classMap = new Map<string, string>();
    (classes || []).forEach((c) => {
      classMap.set(classKey(c.course_id, c.start_date), c.id);
    });

    const tabs = await fetchSheetTabs(sheetId);

    let alunosNovos = 0;
    let alunosAtualizados = 0;
    let abasIgnoradas: string[] = [];
    const cursosTocados = new Set<string>();
    const errors: string[] = [];

    for (const tab of tabs) {
      const csv = await fetchSheetCSV(sheetId, tab.gid);
      if (!csv) { abasIgnoradas.push(tab.title); continue; }
      const rows = csvToObjects(csv);
      if (rows.length === 0) { abasIgnoradas.push(tab.title); continue; }

      // Try to detect if this whole tab is for one specific course (tab title matches a course)
      const tabSlug = slugify(tab.title);
      const tabCourseMatch = courseBySlug.get(tabSlug)
        ?? [...courseBySlug.entries()].find(([slug]) => slug.includes(tabSlug) || tabSlug.includes(slug))?.[1];

      let parsedAny = false;
      let rowIdx = 1;
      for (const row of rows) {
        rowIdx++;
        const studentName = findKeyVal(row, ["aluno", "nome", "student", "participante"]);
        if (!studentName) continue;

        const courseName = findKeyVal(row, ["curso", "course"]);
        let course = tabCourseMatch;
        if (courseName) {
          const cs = slugify(String(courseName));
          course = courseBySlug.get(cs)
            ?? [...courseBySlug.entries()].find(([slug]) => slug.includes(cs) || cs.includes(slug))?.[1]
            ?? course;
        }
        if (!course) continue;

        const startRaw = findKeyVal(row, ["inicio", "start", "data inicio", "início"]);
        const endRaw = findKeyVal(row, ["fim", "end", "data fim", "término", "termino"]);
        const start = parseDate(startRaw);
        const end = parseDate(endRaw);
        const classLabel = findKeyVal(row, ["turma", "class", "grupo"]);

        const payRaw = findKeyVal(row, ["pago", "pagamento", "financeiro", "status pagamento"]);
        const contractRaw = findKeyVal(row, ["contrato", "contract"]);
        const email = findKeyVal(row, ["email", "e-mail"]);
        const phone = findKeyVal(row, ["telefone", "celular", "whatsapp", "phone"]);
        const notes = findKeyVal(row, ["obs", "observa", "notes"]);

        const classId = start ? classMap.get(classKey(course.id, start)) : null;

        const record = {
          user_id: userId,
          course_id: course.id,
          class_id: classId ?? null,
          student_name: String(studentName).trim(),
          student_email: email ? String(email).trim() : null,
          student_phone: phone ? String(phone).trim() : null,
          payment_status: parsePaymentStatus(payRaw),
          contract_status: parseContractStatus(contractRaw),
          class_start_date: start,
          class_end_date: end,
          class_label: classLabel ? String(classLabel).trim() : null,
          source_sheet: tab.title,
          source_row: rowIdx,
          notes: notes ? String(notes).trim() : null,
          synced_at: new Date().toISOString(),
        };

        // Check existing
        const { data: existing } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", course.id)
          .ilike("student_name", record.student_name)
          .eq("class_start_date", start ?? "1900-01-01")
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("course_enrollments").update(record).eq("id", existing.id);
          if (error) errors.push(`Linha ${rowIdx} (${tab.title}): ${error.message}`);
          else alunosAtualizados++;
        } else {
          const { error } = await supabase.from("course_enrollments").insert(record);
          if (error) errors.push(`Linha ${rowIdx} (${tab.title}): ${error.message}`);
          else alunosNovos++;
        }
        parsedAny = true;
        cursosTocados.add(course.id);
      }

      if (!parsedAny) abasIgnoradas.push(tab.title);
    }

    const summary = {
      cursosAtualizados: cursosTocados.size,
      alunosNovos,
      alunosAtualizados,
      abasIgnoradas,
      errors: errors.slice(0, 20),
      synced_at: new Date().toISOString(),
    };

    // Update sheet_config last_synced_at
    await supabase.from("sheet_config")
      .update({ last_synced_at: summary.synced_at, last_sync_summary: summary })
      .eq("user_id", userId);

    return new Response(JSON.stringify(summary), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-sheet error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
