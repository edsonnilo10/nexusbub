import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_courses",
  title: "Listar cursos",
  description:
    "Lista cursos do Nexus com filtros opcionais por unidade (sp/bsb), tipo (modular/pos_graduacao) e busca por nome/mnemônico.",
  inputSchema: {
    unit: z.enum(["sp", "bsb"]).optional().describe("Unidade: sp ou bsb"),
    type: z.enum(["modular", "pos_graduacao"]).optional().describe("Tipo de curso"),
    search: z.string().optional().describe("Termo para buscar em nome ou mnemônico"),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unit, type, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let q = sb(ctx)
      .from("courses")
      .select("id, name, mnemonic, unit, type, modality, workload_hours, price")
      .order("name")
      .limit(limit ?? 50);
    if (unit) q = q.eq("unit", unit);
    if (type) q = q.eq("type", type);
    if (search) q = q.or(`name.ilike.%${search}%,mnemonic.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
