import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["valor_liquido", "parcelas", "valor_parcela"],
  properties: {
    valor_liquido: { type: ["number", "null"], description: "Valor líquido em reais" },
    parcelas: { type: ["integer", "null"], description: "Número de parcelas" },
    valor_parcela: { type: ["number", "null"], description: "Valor da primeira parcela em reais" },
  },
};

async function readOne(image: string, key: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "simulacao", strict: true, schema } },
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Print de simulação de financiamento Unicred. Extraia 'Valor líquido', 'Parcelas' e 'Valor da primeira parcela' como números (ex. R$ 14.338,00 -> 14338). Use null se não visível." },
          { type: "input_image", image_url: image },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err = new Error(res.status === 402 ? "Créditos de IA esgotados. Adicione créditos ao workspace." :
      res.status === 429 ? "Muitas leituras ao mesmo tempo. Tente novamente em instantes." : `Falha ao ler o print (${res.status}): ${t.slice(0, 200)}`);
    (err as any).status = res.status;
    throw err;
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") out += ev.delta;
      } catch { /* ignore */ }
    }
  }
  return JSON.parse(out);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Faça login novamente." }, 401);
    const { data: ok } = await admin.rpc("is_approved", { _user_id: user.id });
    if (!ok) return json({ error: "Acesso não aprovado." }, 403);

    const body = await req.json().catch(() => null);
    const images = body?.images;
    if (!Array.isArray(images) || images.length === 0 || images.length > 10 ||
      !images.every((i: unknown) => typeof i === "string" && i.startsWith("data:image/") && i.length < 8_000_000)) {
      return json({ error: "Envie de 1 a 10 imagens." }, 400);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "IA não configurada." }, 500);
    const results = [];
    for (const img of images) results.push(await readOne(img, key));
    return json({ results });
  } catch (e) {
    const status = (e as any).status;
    return json({ error: (e as Error).message }, status === 402 || status === 429 ? status : 500);
  }
});
