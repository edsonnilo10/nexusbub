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

    const body = await req.json() as {
      courseId?: string | null;
      messages: IncomingMessage[];
      mode?: "assistant" | "faq";
    };
    const { courseId, messages } = body;
    const requestMode: "assistant" | "faq" = body.mode === "faq" ? "faq" : "assistant";
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (requestMode === "faq" && !courseId) {
      return new Response(JSON.stringify({ error: "courseId é obrigatório no modo FAQ" }), {
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
        // No modo FAQ trunca para não estourar o contexto (pós-graduações têm 30+ módulos)
        const maxItems = requestMode === "faq" ? 20 : modules.length;
        const maxChars = requestMode === "faq" ? 3000 : Infinity;
        let used = 0;
        let shown = 0;
        for (const m of modules.slice(0, maxItems)) {
          const wl = m.workload_hours ? ` (${m.workload_hours}h)` : "";
          const line = `- ${m.title}${wl}${m.description ? `: ${m.description}` : ""}`;
          if (used + line.length > maxChars) break;
          ctx.push(line);
          used += line.length + 1;
          shown += 1;
        }
        if (shown < modules.length) {
          ctx.push(`- (+${modules.length - shown} módulos adicionais não listados)`);
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

    const faqSystemPrompt = `Você é o assistente de perguntas frequentes da **Escola Nexus de Ultrassonografia**.
Responda dúvidas de alunos e leads sobre este curso específico.

# REGRAS INEGOCIÁVEIS
- Use APENAS os dados do curso abaixo. NUNCA invente.
- Se a informação não estiver nos dados, responda exatamente: "Essa informação não está cadastrada — consulte a secretaria."
- Português do Brasil, tom acolhedor e profissional.
- Máximo de **4 linhas** por resposta. Direto ao ponto.
- Formatação simples (pode usar *negrito* e _itálico_ estilo WhatsApp).
- Sem emojis excessivos (no máximo 1 por resposta, se fizer sentido).
- Não inclua saudações ("Olá!", "Oi!"), não inclua CTAs de venda ("Posso te ajudar?"), não inclua marcadores tipo "---WHATSAPP---".

# CONTEXTO DO CURSO — fonte única da verdade
${ctx.join("\n")}`;

    const assistantSystemPrompt = `Você é o **Copiloto de Vendas da Nexus Ultrassonografia**, um assistente de IA exclusivo para Executivos de Vendas (Closers).
Você apoia a equipe comercial fornecendo **dados precisos** e, quando solicitado, **roteiros de persuasão**.

# REGRA Nº 1 — RESPONDA SÓ O QUE FOI PERGUNTADO (INEGOCIÁVEL)
Antes de escrever qualquer coisa, identifique a **intenção real** da pergunta e responda APENAS isso. Não despeje frameworks, pitches, NEPQ ou objeções de venda se o Closer não pediu.

Mapa de intenção → resposta esperada:
- "Qual a carga horária?" → só a carga horária. 1 linha.
- "Qual o conteúdo / programa / módulos?" → só a lista de módulos cadastrados. Sem pitch.
- "Quando começa? Quais as datas?" → só as datas das próximas turmas. Sem pitch.
- "Qual o valor / preço / parcelamento?" → só o investimento. Sem pitch.
- "Qual a modalidade? Onde acontece?" → só modalidade/unidade.
- "Quais os diferenciais? O que está incluso?" → só os diferenciais cadastrados, em bullets curtos.
- Pergunta factual qualquer → resposta factual, direta, curta.

**Só use o arsenal completo de vendas (Ficha Técnica + Pitch WhatsApp + perguntas NEPQ + Quebra de Objeções) quando o Closer pedir EXPLICITAMENTE**, com termos como:
- "me dá um pitch", "como vendo esse curso", "monta uma argumentação", "objeções", "quebra de objeção", "NEPQ", "perguntas de descoberta", "mensagem pronta pra mandar", "como abordo o lead", "monta um social selling", "preciso convencer".

Se a pergunta for puramente informativa, **NÃO inclua** seções de pitch, NEPQ, objeções, gatilhos de escassez, nem mensagem pronta de WhatsApp. Nada de "---WHATSAPP---".

# COMPORTAMENTO E TOM
- Direto, analítico, sem jargão robótico, sem rodeios.
- Português do Brasil.
- Respostas curtas e escaneáveis. Se 2 linhas resolvem, use 2 linhas.
- Não invente seções nem sub-headings que não foram pedidos.

# REGRA DE OURO DOS DADOS
- Use APENAS o contexto abaixo para datas, unidade, carga horária, preço, parcelamento, módulos, diferenciais, vagas.
- **NUNCA invente.** Se faltar info, diga: "Essa informação não está no cadastro — confirme com a coordenação."
- Datas no formato **DD/MM/AAAA** (use o ano que está no contexto).
- Unidade: **BSB** (Brasília) ou **SP** (São Paulo).
- Os blocos **Básico + Prático de Medicina Interna (MEDI + PTMI)** e **Ginecologia + Transvaginal (GIOB + TRVG)** são vendidos como pares — mencione o par **apenas se a pergunta envolver venda/recomendação**, não em respostas factuais simples.

# QUANDO O CLOSER PEDIR UM PITCH / ARGUMENTAÇÃO COMPLETA
Aí sim, e só aí, use este template:

**📋 Ficha Técnica Rápida** — data, carga horária, unidade, investimento.

**💬 Pitch para WhatsApp** — até 4 linhas, formatação WhatsApp (*negrito*, _itálico_), emojis com moderação, CTA suave no fim.

**🎯 NEPQ — 2 perguntas de situação/dor** focadas em rotina clínica ou receita perdida.

**🛡️ Quebra de Objeções** — 1 linha para "está caro" e 1 linha para "sem tempo agora".

E nesse caso (e só nesse caso), você pode anexar uma mensagem pronta para o lead após o marcador "---WHATSAPP---", em primeira pessoa, tom acolhedor, formatação WhatsApp.

# FORMATO DE SAÍDA
- Resposta padrão: texto direto respondendo a pergunta. SEM marcador "---WHATSAPP---".
- Resposta de pitch (só quando solicitado): bloco interno + opcionalmente "---WHATSAPP---" + mensagem pronta.

# FORA DO ESCOPO
Se a pergunta não tem nada a ver com a Nexus, diga educadamente em 1 linha que seu foco é apoio comercial — mas ainda ajude no que der, curto.

# CONTEXTO ${mode === "course" ? "DO CURSO" : "GLOBAL (catálogo + agenda)"} — fonte única da verdade
${ctx.join("\n")}

${mode === "global" ? `> Modo atual: **VISÃO GERAL**. Responda perguntas factuais sobre catálogo/agenda de forma direta. Só monte pitch quando pedido.` : `> Modo atual: **CURSO ESPECÍFICO**. Mesma regra: responda só o que foi perguntado. Pitch completo só quando o Closer pedir.`}`;

    const systemPrompt = requestMode === "faq" ? faqSystemPrompt : assistantSystemPrompt;

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

    if (requestMode === "faq") {
      // Modo FAQ: resposta única, texto limpo — o cliente formata para WhatsApp
      const answer = stripMarkers(fullText).replace(/---WHATSAPP---[\s\S]*$/i, "").trim();
      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
