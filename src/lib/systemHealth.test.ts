import { describe, expect, it } from "vitest";
import {
  evaluateSystemHealth,
  summarizeHealth,
  WHATSAPP_LIMIT,
  type HealthInput,
} from "./systemHealth";

const base = (overrides: Partial<HealthInput> = {}): HealthInput => ({
  connectionError: null,
  isAdmin: true,
  pendingApprovals: 2,
  auditReadable: true,
  emailFunction: 400,
  courses: [
    { id: "c1", name: "Básico de US em Ginecologia e Obstetrícia", unit: "sao_paulo" },
    { id: "c2", name: "Ultrassonografia Transvaginal", unit: "brasilia" },
  ],
  classLinks: [
    { course_id: "c1", start_date: "2027-03-05", end_date: "2027-03-07" },
    { course_id: "c2", start_date: "2027-04-02", end_date: "2027-04-04" },
  ],
  groupIds: ["g1", "g2"],
  linkedGroupIds: ["g1", "g2"],
  overrides: [{ course_id: "c1", wa_short: "oi", wa_full: "tudo", wa_2027: { short: "oi" } }],
  moduleCounts: { c1: 12, c2: 6 },
  today: "2026-11-04",
  ...overrides,
});

const byId = (results: ReturnType<typeof evaluateSystemHealth>, id: string) =>
  results.find((r) => r.id === id)!;

describe("teste do sistema: checagens de administrador", () => {
  it("passa quando tudo está certo", () => {
    const results = evaluateSystemHealth(base());
    expect(results.every((r) => r.status === "ok")).toBe(true);
    expect(summarizeHealth(results)).toEqual({ ok: 9, warn: 0, fail: 0, total: 9 });
  });

  it("reprova quando o servidor não responde", () => {
    const results = evaluateSystemHealth(base({ connectionError: "offline" }));
    expect(byId(results, "connection").status).toBe("fail");
    expect(byId(results, "connection").detail).toContain("offline");
  });

  it("reprova sem papel de administrador", () => {
    expect(byId(evaluateSystemHealth(base({ isAdmin: false })), "admin").status).toBe("fail");
  });

  it("confirma o e-mail quando o serviço responde 400 ao corpo vazio", () => {
    expect(byId(evaluateSystemHealth(base({ emailFunction: 400 })), "email").status).toBe("ok");
  });

  it("reprova quando o serviço de e-mail recusa o acesso", () => {
    expect(byId(evaluateSystemHealth(base({ emailFunction: 403 })), "email").status).toBe("fail");
  });

  it("reprova quando o serviço de e-mail não responde", () => {
    expect(byId(evaluateSystemHealth(base({ emailFunction: "unreachable" })), "email").status).toBe("fail");
  });

  it("avisa quando o serviço de e-mail responde outro código", () => {
    expect(byId(evaluateSystemHealth(base({ emailFunction: 500 })), "email").status).toBe("warn");
  });

  it("reprova quando uma cidade fica sem curso", () => {
    const results = evaluateSystemHealth(
      base({ courses: [{ id: "c1", name: "Curso SP", unit: "sao_paulo" }] }),
    );
    const check = byId(results, "courses");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("Brasília");
  });

  it("reprova período com fim antes do início", () => {
    const results = evaluateSystemHealth(
      base({
        classLinks: [{ course_id: "c1", start_date: "2027-03-07", end_date: "2027-03-05" }],
      }),
    );
    const check = byId(results, "dates");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("fim antes do início");
  });

  it("reprova data repetida para o mesmo curso", () => {
    const results = evaluateSystemHealth(
      base({
        classLinks: [
          { course_id: "c1", start_date: "2027-03-05", end_date: "2027-03-07" },
          { course_id: "c1", start_date: "2027-03-05", end_date: "2027-03-07" },
        ],
      }),
    );
    const check = byId(results, "dates");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("repetida");
  });

  it("avisa quando a data já passou", () => {
    const results = evaluateSystemHealth(
      base({
        classLinks: [{ course_id: "c1", start_date: "2026-01-05", end_date: "2026-01-07" }],
      }),
    );
    const check = byId(results, "dates");
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("já passou");
  });

  it("reprova mensagem acima do limite do WhatsApp", () => {
    const results = evaluateSystemHealth(
      base({
        overrides: [
          { course_id: "c1", wa_full: "x".repeat(WHATSAPP_LIMIT + 10) },
          { course_id: "c2", wa_2027: { full: "y".repeat(WHATSAPP_LIMIT + 1) } },
        ],
      }),
    );
    const check = byId(results, "messages");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain(WHATSAPP_LIMIT.toLocaleString("pt-BR"));
    expect(check.detail).toContain("Básico de US em Ginecologia e Obstetrícia");
  });

  it("não reprova mensagem exatamente no limite", () => {
    const results = evaluateSystemHealth(
      base({ overrides: [{ course_id: "c1", wa_full: "x".repeat(WHATSAPP_LIMIT) }] }),
    );
    expect(byId(results, "messages").status).toBe("ok");
  });

  it("avisa curso sem módulos", () => {
    const results = evaluateSystemHealth(base({ moduleCounts: { c1: 12 } }));
    const check = byId(results, "modules");
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("Ultrassonografia Transvaginal");
  });

  it("avisa curso sem data e turma sem curso", () => {
    const results = evaluateSystemHealth(
      base({ classLinks: [{ course_id: "c1", start_date: "2027-03-05", end_date: null }], groupIds: ["g1", "g2"], linkedGroupIds: ["g1"] }),
    );
    const check = byId(results, "links");
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("Ultrassonografia Transvaginal");
    expect(check.detail).toContain("1 turma(s) sem curso vinculado");
  });

  it("mostra a contagem de cadastros aguardando aprovação", () => {
    const results = evaluateSystemHealth(base({ pendingApprovals: 3 }));
    const check = byId(results, "approvals");
    expect(check.status).toBe("ok");
    expect(check.detail).toContain("3 cadastros aguardando");
  });
});
