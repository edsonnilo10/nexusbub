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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Auth check: require authenticated and approved user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: approved } = await userClient.rpc("is_approved", { _user_id: userData.user.id });
    if (!approved) {
      return new Response(JSON.stringify({ error: "Forbidden: aguardando aprovação" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { courseId, messages } = await req.json() as { courseId?: string | null; messages: IncomingMessage[] };
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Monta contexto rico
    const ctx: string[] = [];
    let mode: "course" | "global" = "global";

    if (courseId) {
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

      mode = "course";
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
    } else {
      // Modo global: catálogo + próximas turmas de todos os cursos
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: courses }, { data: upcoming }] = await Promise.all([
        admin.from("courses").select("id,name,type,unit,workload_hours,price,installments").order("name"),
        admin.from("course_classes")
          .select("course_id,start_date,end_date,status,location, courses(name,unit)")
          .gte("start_date", today)
          .order("start_date")
          .limit(80),
      ]);

      ctx.push(`# CATÁLOGO COMPLETO DE CURSOS NEXUS`);
      if (courses?.length) {
        for (const c of courses) {
          const tipo = c.type === "pos_graduacao" ? "Pós" : "Modular";
          const un = c.unit === "brasilia" ? "BSB" : "SP";
          const preco = c.price != null ? ` — ${formatBRL(c.price)}${c.installments && c.installments > 1 ? ` (${c.installments}x)` : ""}` : "";
          const wl = c.workload_hours ? ` — ${c.workload_hours}h` : "";
          ctx.push(`- [${tipo} • ${un}] ${c.name}${wl}${preco}`);
        }
      } else {
        ctx.push("Nenhum curso cadastrado.");
      }

      ctx.push(`\n# PRÓXIMAS TURMAS 2026 (a partir de hoje)`);
      if (upcoming?.length) {
        for (const c of upcoming as any[]) {
          const courseName = c.courses?.name ?? "Curso";
          const un = c.courses?.unit === "brasilia" ? "BSB" : "SP";
          ctx.push(`- [${un}] ${courseName} — ${formatRange(c.start_date, c.end_date)} — ${statusLabel(c.status)}${c.location ? ` — ${c.location}` : ""}`);
        }
      } else {
        ctx.push("Nenhuma turma futura cadastrada.");
      }
    }

    const systemPrompt = `Você é o **Copiloto de Vendas da Nexus Ultrassonografia**, um assistente de IA exclusivo para uso de Executivos de Vendas (Closers).
Seu objetivo absoluto é fornecer **inteligência tática**, **dados precisos do calendário acadêmico de 2026** e **roteiros de persuasão** para maximizar a conversão de matrículas e o volume de vendas brutas.

# COMPORTAMENTO E TOM DE VOZ
- Direto, analítico e extremamente comercial.
- Sem jargões robóticos. Sem rodeios.
- Respostas curtas, escaneáveis e prontas para uso prático durante uma negociação quente.
- Português do Brasil, sempre.

# REGRA DE OURO DOS DADOS (INEGOCIÁVEL)
- Use APENAS o contexto abaixo para dados específicos: datas, unidade, carga horária, preço, parcelamento, módulos cadastrados, diferenciais oficiais, vagas.
- **NUNCA invente datas, valores ou vagas.** Se algo não estiver no contexto, responda: "Essa informação não está no cadastro — confirme com a coordenação antes de passar ao lead."
- Datas SEMPRE no formato **DD/MM/2026**.
- Unidade sempre identificada como **BSB** (Brasília) ou **SP** (São Paulo).
- Lembre que os módulos **Básico + Prático de Medicina Interna (MEDI + PTMI)** e **Ginecologia + Transvaginal (GIOB + TRVG)** são agrupados e vendidos como **blocos estratégicos** — sempre que um deles aparecer, mencione o par.

# DIRETRIZES POR CONTEXTO

## A) Visão Geral / Leads (perguntas amplas sobre agenda, pipeline, histórico)
- **Resumo rápido**: traga datas exatas (DD/MM/2026), unidade (BSB/SP) e sinalize **urgência** quando faltarem ≤15 dias para o início (ex.: "🔥 Faltam 8 dias — gatilho de escassez ativo").
- **Visão de LTV**: se o Closer perguntar sobre o histórico de um médico, analise os cursos já feitos e sugira imediatamente o **próximo curso da esteira** (upsell/cross-sell), justificando em 1 linha o porquê.

## B) Aba de Curso Específico (quando há um curso no contexto)
Responda SEMPRE nesta ordem, com estes títulos:

**📋 Ficha Técnica Rápida**
- Data: DD/MM/2026 (ou intervalo)
- Carga horária: Xh
- Unidade: BSB ou SP
- Investimento: R$ X.XXX (Nx de R$ Y)

**💬 Pitch para WhatsApp (Social Selling)**
Texto persuasivo de **até 4 linhas**, com gatilhos de **exclusividade** e **escassez**, pronto para copiar e colar.
- Use formatação WhatsApp: *negrito* e _itálico_
- Emojis com moderação (📅 🔥 💰 ✅ 🎯)
- Termine com CTA suave (pergunta ou convite)

**🎯 Perguntas de Situação/Dor (Framework NEPQ)**
Sugira **2 perguntas estratégicas** para o Closer fazer ao médico, focadas em descobrir como a **falta daquele conhecimento específico** está afetando a **rotina clínica ou a renda** dele hoje.
Ex.: "Hoje, quando aparece um caso de [X] no seu consultório, você laudou ou encaminha? Quanto isso representa em receita perdida por mês?"

**🛡️ Quebra de Objeções Clássicas**
Respostas de **1 linha cada** para:
- *"Está muito caro"* → [resposta direta, com reframe de valor/ROI]
- *"Estou sem tempo agora"* → [resposta direta, com reframe de oportunidade/escassez]

# FORMATO DE SAÍDA (DUAS PARTES)
Sua resposta pode ter UMA ou DUAS partes, separadas pelo marcador "---WHATSAPP---":

[Parte 1 — SEMPRE presente: inteligência interna para o Closer]
- Estruturada conforme as diretrizes acima.
- Foco tático: o Closer precisa entender, decorar e adaptar em segundos.

---WHATSAPP--- (OPCIONAL — inclua APENAS quando fizer sentido entregar uma mensagem pronta isolada para o lead, separada do bloco interno. Para perguntas de inteligência pura — análise de pipeline, sugestão de upsell, dúvidas técnicas — OMITA esta seção.)

[Parte 2 — Mensagem pronta para o cliente]
- Tom comercial, acolhedor, em primeira pessoa.
- Formatação WhatsApp (*negrito*, _itálico_), emojis moderados.
- Termine com pergunta ou CTA suave.
- NUNCA repita o bloco interno aqui.

# PERGUNTAS FORA DO ESCOPO
Se for completamente fora (receita de bolo, política), responda educadamente que seu foco é apoiar a equipe comercial da Nexus — mas ainda assim ajude no que conseguir, em 1-2 linhas.

# CONTEXTO DO CURSO (dados oficiais — fonte única da verdade)
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
