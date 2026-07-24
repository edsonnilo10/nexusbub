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
  name: "list_upcoming_classes",
  title: "Próximas turmas",
  description: "Lista as próximas turmas (class_groups) com filtro opcional por unidade e janela em dias.",
  inputSchema: {
    unit: z.enum(["sp", "bsb"]).optional().describe("Unidade: sp ou bsb"),
    days_ahead: z
      .number()
      .int()
      .min(1)
      .max(365)
      .optional()
      .describe("Janela em dias a partir de hoje (padrão 90)"),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unit, days_ahead, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const today = new Date();
    const until = new Date(today.getTime() + (days_ahead ?? 90) * 86400000);
    let q = sb(ctx)
      .from("class_groups")
      .select("id, start_date, end_date, status, unit, location, class_group_courses(course:courses(id, name, mnemonic))")
      .gte("start_date", today.toISOString().slice(0, 10))
      .lte("start_date", until.toISOString().slice(0, 10))
      .order("start_date")
      .limit(limit ?? 100);
    if (unit) q = q.eq("unit", unit);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { class_groups: data ?? [] },
    };
  },
});
