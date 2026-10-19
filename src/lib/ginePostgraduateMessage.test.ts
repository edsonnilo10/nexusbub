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
  it("mantém 11 módulos na turma de Brasília", () => {
    expect(getPostgraduate2027Schedule(course)?.moduleCount).toBe(11);
    expect(getPostgraduate2027Schedule(course)?.dates).toHaveLength(11);
  });
  it.each([
    [1, "11 A 13/03/27"], [2, "08 A 10/04/27"], [3, "06 A 08/05/27"],
    [4, "03 A 05/06/27"], [5, "01 A 03/07/27"], [6, "05 A 07/08/27"],
    [7, "09 A 11/09/27"], [8, "30/09 A 02/10/27"], [9, "11 A 13/11/27"],
    [10, "09 A 11/12/27"], [11, "21/01/28"],
  ])("módulo %i usa a data informada %s", (module, date) => {
    expect(getPostgraduate2027Schedule(course)?.dates[Number(module) - 1]).toBe(date);
  });
  it("mantém resumos dentro de 4095 caracteres independentemente do tamanho dos tópicos", () => {
    const modules: CourseModule[] = Array.from({ length: 11 }, (_, i) => ({
      id: String(i), course_id: "gine", title: `Módulo ${i + 1}: ${"Tema ".repeat(24)}`,
      description: "Conteúdo detalhado. ".repeat(500), workload_hours: i === 10 ? 20 : 30, order_index: i,
    }));
    for (const year of [2026, 2027]) {
      expect(ginePostgraduateMessage(course, modules, year, getPostgraduate2027Schedule(course)?.dates ?? []).length).toBeLessThanOrEqual(4095);
    }
  });
});