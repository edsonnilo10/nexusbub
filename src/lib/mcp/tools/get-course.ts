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
  name: "get_course",
  title: "Detalhes do curso",
  description:
    "Retorna informações completas de um curso (por id OU mnemônico + unidade), incluindo módulos e próximas turmas.",
  inputSchema: {
    id: z.string().uuid().optional().describe("ID do curso"),
    mnemonic: z.string().optional().describe("Mnemônico (ex.: CM US MORF)"),
    unit: z.enum(["sp", "bsb"]).optional().describe("Unidade — obrigatória quando usar mnemônico"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, mnemonic, unit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const client = sb(ctx);
    let courseQ = client.from("courses").select("*").limit(1);
    if (id) courseQ = courseQ.eq("id", id);
    else if (mnemonic && unit) courseQ = courseQ.eq("mnemonic", mnemonic).eq("unit", unit);
    else
      return {
        content: [{ type: "text", text: "Informe id OU (mnemonic + unit)" }],
        isError: true,
      };

    const { data: courseRows, error } = await courseQ;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const course = courseRows?.[0];
    if (!course) return { content: [{ type: "text", text: "Curso não encontrado" }], isError: true };

    const [{ data: modules }, { data: links }] = await Promise.all([
      client
        .from("course_modules")
        .select("title, description, position")
        .eq("course_id", course.id)
        .order("position"),
      client
        .from("class_group_courses")
        .select("class_group:class_groups(id, start_date, end_date, status, unit, location)")
        .eq("course_id", course.id),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = (links ?? [])
      .map((l: any) => l.class_group)
      .filter((g: any) => g && g.start_date >= today)
      .sort((a: any, b: any) => a.start_date.localeCompare(b.start_date));

    const payload = { course, modules: modules ?? [], upcoming_class_groups: upcoming };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
