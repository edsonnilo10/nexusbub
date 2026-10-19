import { describe, expect, it } from "vitest";
import { getPostgraduate2027Schedule, isPostgraduate2027Hybrid } from "./postgraduate2027";
import { ginePostgraduateMessage } from "./ginePostgraduateMessage";
import type { CourseFull, CourseModule } from "./courseHelpers";

const course: CourseFull = {
  id: "gine", name: "Pós-graduação lato sensu em Ultrassonografia em Ginecologia Avançada e Endometriose",
  mnemonic: "PG US GINE", type: "pos_graduacao", unit: "brasilia", slug: null,
  description: null, cover_url: null, workload_hours: 360, workload_breakdown: null,
  modality: "Presencial", price: null, installments: null, payment_methods: null,
  highlights: null, created_at: "", updated_at: "",
};

describe("GINE: oferta e cronograma", () => {
  it("não oferece formato híbrido", () => {
    expect(isPostgraduate2027Hybrid(course)).toBe(false);
  });
  it("não oferece turma de 2027 em São Paulo", () => {
    expect(getPostgraduate2027Schedule({ ...course, unit: "sao_paulo" })).toBeNull();
  });
  it("preserva a data de Brasília e os 11 módulos do programa", () => {
    expect(getPostgraduate2027Schedule(course)).toMatchObject({ dates: ["11 A 13/03/27"], moduleCount: 11 });
  });
  it("mantém resumos dentro de 4095 caracteres independentemente do tamanho dos tópicos", () => {
    const modules: CourseModule[] = Array.from({ length: 11 }, (_, i) => ({
      id: String(i), course_id: "gine", title: `Módulo ${i + 1}: ${"Tema ".repeat(24)}`,
      description: "Conteúdo detalhado. ".repeat(500), workload_hours: i === 10 ? 20 : 30, order_index: i,
    }));
    for (const year of [2026, 2027]) {
      expect(ginePostgraduateMessage(course, modules, year, ["11 A 13/03/27"]).length).toBeLessThanOrEqual(4095);
    }
  });
});