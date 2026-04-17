// Extract course data from PDFs, images or text using Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair informações de cursos de pós-graduação e cursos modulares de medicina/ultrassonografia a partir de documentos (PDFs, prints, planilhas).

Para cada curso identificado no documento, extraia EXATAMENTE estes campos:
- name: Nome completo do curso
- type: "pos_graduacao" se for pós-graduação/especialização, senão "modular"
- workload_hours: Carga horária TOTAL em horas (apenas o número)
- price: Valor total do investimento em reais (apenas número, sem R$)
- installments: Número de parcelas, se houver
- payment_methods: Formas de pagamento mencionadas (texto curto)
- modality: Modalidade (Presencial, Online, Híbrido, etc.)
- description: Descrição/sobre o curso (resumo de 2-4 frases)
- highlights: Diferenciais/destaques em texto corrido
- modules: Array de módulos/disciplinas, cada um com {title, description (opcional), workload_hours (opcional)}
- classes: Array de turmas com {start_date (YYYY-MM-DD), end_date (YYYY-MM-DD opcional), status ("atual"|"proxima"|"encerrada"), location (opcional)}

Use null para campos desconhecidos. Se houver várias turmas mencionadas (ex: "Turma 2025.1" e "Turma 2025.2"), inclua todas.
Se o documento contiver MAIS DE UM curso, retorne todos no array "courses".`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "register_courses",
    description: "Registra os cursos extraídos do documento",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string", enum: ["pos_graduacao", "modular"] },
              workload_hours: { type: ["number", "null"] },
              price: { type: ["number", "null"] },
              installments: { type: ["number", "null"] },
              payment_methods: { type: ["string", "null"] },
              modality: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
              highlights: { type: ["string", "null"] },
              modules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: ["string", "null"] },
                    workload_hours: { type: ["number", "null"] },
                  },
                  required: ["title"],
                  additionalProperties: false,
                },
              },
              classes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    start_date: { type: ["string", "null"] },
                    end_date: { type: ["string", "null"] },
                    status: { type: "string", enum: ["atual", "proxima", "encerrada"] },
                    location: { type: ["string", "null"] },
                  },
                  required: ["status"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "type", "modules", "classes"],
            additionalProperties: false,
          },
        },
      },
      required: ["courses"],
      additionalProperties: false,
    },
  },
};

interface RequestBody {
  // Either provide a base64 file (PDF/image) or extracted text
  fileBase64?: string;
  mimeType?: string;
  text?: string;
  fileName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const body: RequestBody = await req.json();

    // Build user message content
    const userContent: any[] = [];
    const intro = body.fileName
      ? `Documento: ${body.fileName}. Extraia todos os cursos contidos nele.`
      : "Extraia todos os cursos contidos neste documento.";
    userContent.push({ type: "text", text: intro });

    if (body.fileBase64 && body.mimeType) {
      if (body.mimeType.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${body.mimeType};base64,${body.fileBase64}` },
        });
      } else {
        // PDFs and other docs: inline as data URL
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${body.mimeType};base64,${body.fileBase64}` },
        });
      }
    } else if (body.text) {
      userContent.push({ type: "text", text: `Conteúdo extraído:\n\n${body.text}` });
    } else {
      throw new Error("Forneça fileBase64+mimeType ou text");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "register_courses" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no Workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error ${aiResponse.status}: ${errText}`);
    }

    const json = await aiResponse.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "A IA não conseguiu identificar cursos no arquivo.", raw: json }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extract-course error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
