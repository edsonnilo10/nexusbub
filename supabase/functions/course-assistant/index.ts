import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

const formatBRL = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const formatRange = (s: string | null, e: string | null) => {
  if (!s) return "—";
  const sd = new Date(s + "T00:00:00");
  const ed = e ? new Date(e + "T00:00:00") : null;
  const sStr = `${String(sd.getDate()).padStart(2, "0")} de ${MONTHS[sd.getMonth()]}`;
  if (!ed) return `${sStr} de ${sd.getFullYear()}`;
  const eStr = `${String(ed.getDate()).padStart(2, "0")} de ${MONTHS[ed.getMonth()]}`;
  if (sd.getMonth() === ed.getMonth() && sd.getFullYear() === ed.getFullYear())
    return `${String(sd.getDate()).padStart(2, "0")} a ${String(ed.getDate()).padStart(2, "0")} de ${MONTHS[sd.getMonth()]} de ${sd.getFullYear()}`;
  return `${sStr} a ${eStr} de ${ed.getFullYear()}`;
};

const statusLabel = (s: string) =>
  s === "atual" ? "em andamento" :
  s === "proxima" ? "confirmada" :
  s === "aguardando_confirmacao" ? "aguardando confirmação" : "encerrada";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { courseId, messages } = await req.json() as { courseId: string; messages: IncomingMessage[] };
    if (!courseId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "courseId e messages são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: course }, { data: modules }, { data: classes }] = await Promise.all([
      admin.from("courses").select("*").eq("id", courseId).maybeSingle(),
      admin.from("course_modules").select("*").eq("course_id", courseId).order("order_index"),
      admin.from("course_classes").select("*").eq("course_id", courseId).order("start_date"),
    ]);

    if (!course) {
      return new Response(JSON.stringify({ error: "Curso não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta contexto rico do curso
    const ctx: string[] = [];
    ctx.push(`# CURSO: ${course.name}`);
    ctx.push(`Tipo: ${course.type === "pos_graduacao" ? "Pós-graduação" : "Curso modular"}`);
    ctx.push(`Unidade: ${course.unit === "brasilia" ? "Brasília/DF" : "São Paulo/SP"}`);
    if (course.workload_hours) ctx.push(`Carga horária total: ${course.workload_hours} horas`);
    if (course.modality) ctx.push(`Modalidade: ${course.modality}`);
    if (course.description) ctx.push(`\nDescrição:\n${course.description}`);
    if (course.highlights) ctx.push(`\nDiferenciais:\n${course.highlights}`);

    if (course.price != null) {
      ctx.push(`\n## INVESTIMENTO`);
      ctx.push(`Valor à vista: ${formatBRL(course.price)}`);
      if (course.installments && course.installments > 1)
        ctx.push(`Parcelado: ${course.installments}x de ${formatBRL(course.price / course.installments)}`);
      if (course.payment_methods) ctx.push(`Formas de pagamento: ${course.payment_methods}`);
    }

    if (modules?.length) {
      ctx.push(`\n## MÓDULOS / CONTEÚDO PROGRAMÁTICO`);
      for (const m of modules) {
        const wl = m.workload_hours ? ` (${m.workload_hours}h)` : "";
        ctx.push(`- ${m.title}${wl}${m.description ? `: ${m.description}` : ""}`);
      }
    }

    if (classes?.length) {
      ctx.push(`\n## TURMAS 2026`);
      for (const c of classes) {
        ctx.push(`- ${formatRange(c.start_date, c.end_date)} — ${statusLabel(c.status)}${c.location ? ` — ${c.location}` : ""}`);
      }
    } else {
      ctx.push(`\n## TURMAS\nNenhuma turma cadastrada — datas a confirmar.`);
    }

    const systemPrompt = `Você é o **Assistente Comercial Nexus**, especialista nos cursos da Escola Nexus de Ultrassonografia.
Seu papel é ajudar a equipe de vendas a responder dúvidas de potenciais alunos com agilidade e precisão.

REGRAS CRÍTICAS:
1. Use APENAS as informações do curso fornecidas abaixo. NUNCA invente preços, datas, módulos ou diferenciais.
2. Se a informação não estiver no contexto, responda honestamente: "Essa informação não está no cadastro do curso. Recomendo confirmar com a coordenação."
3. Sempre responda em português do Brasil.
4. Quando o vendedor perguntar sobre datas, mencione TODAS as turmas relevantes de 2026.
5. Tom profissional, acolhedor e consultivo — nunca agressivo.

FORMATO DA RESPOSTA (OBRIGATÓRIO — siga exatamente):
Você deve retornar DUAS seções separadas pelo marcador "---WHATSAPP---":

[Primeira parte — Resposta interna para o vendedor]
- Direta, em tópicos quando fizer sentido
- Foco em dar a informação para o vendedor entender e adaptar
- Pode incluir notas/observações úteis ("vale destacar que...", "se o cliente perguntar X, mencione Y")

---WHATSAPP---

[Segunda parte — Mensagem pronta para enviar ao cliente]
- Tom comercial, acolhedor, em primeira pessoa
- Use formatação WhatsApp: *negrito* e _itálico_
- Use emojis com moderação (📅 🕒 💰 📍 ✅ 🎯)
- Termine com uma pergunta ou CTA suave que mantenha a conversa viva
- NUNCA inclua a primeira parte aqui

CONTEXTO DO CURSO:
${ctx.join("\n")}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao consultar a IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const fullText: string = data.choices?.[0]?.message?.content ?? "";

    // Limpa marcadores que a IA às vezes inclui literalmente
    const stripMarkers = (s: string) =>
      s
        .replace(/^\s*\[?Primeira parte[^\]\n]*\]?\s*\n?/i, "")
        .replace(/^\s*\[?Segunda parte[^\]\n]*\]?\s*\n?/i, "")
        .replace(/^\s*\[?Resposta interna[^\]\n]*\]?\s*\n?/i, "")
        .replace(/^\s*\[?Mensagem (pronta )?para[^\]\n]*\]?\s*\n?/i, "")
        .trim();

    let internal = stripMarkers(fullText);
    let whatsapp = "";
    if (fullText.includes("---WHATSAPP---")) {
      const [a, b] = fullText.split("---WHATSAPP---");
      internal = stripMarkers(a);
      whatsapp = stripMarkers(b || "");
    }

    return new Response(JSON.stringify({ internal, whatsapp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("course-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
