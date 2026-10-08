import { describe, expect, it } from "vitest";
import { CourseFull, CourseModule } from "./courseHelpers";
import { fullMessage } from "./whatsappTemplates";
import { postgraduate2027FullMessage } from "./postgraduate2027";

const course: CourseFull = {
  id: "pain", name: "PG US DORM T1 - Pós-Graduação Lato Sensu em Intervenções Ambulatoriais em Dor",
  mnemonic: "PG US DORM", type: "pos_graduacao", unit: "sao_paulo", slug: null,
  description: "Formação em dor.", cover_url: null, workload_hours: 425,
  workload_breakdown: "120h teóricas e 240h práticas (12 módulos presenciais), + 60h de orientação de TCC e 5h de conteúdo complementar",
  modality: null, price: null, installments: null, payment_methods: null, highlights: null,
  created_at: "", updated_at: "",
};
const modules: CourseModule[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i), course_id: course.id, order_index: i + 1, title: `Módulo ${i + 1}`,
  description: "Descrição longa. ".repeat(100), workload_hours: 25,
}));

describe("Mensagem completa da Pós em Dor", () => {
  for (const unit of ["sao_paulo", "brasilia"] as const) {
    it(`preserva informações e encerramento em ${unit} para 2026 e 2027`, () => {
      const c = { ...course, unit };
      const dates = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")} A 16/05/27`);
      const messages = [
        fullMessage(c, modules, [{ id: "class", course_id: c.id, start_date: "2026-12-18", end_date: "2026-12-20", status: "proxima", location: null, notes: null }]),
        postgraduate2027FullMessage(c, modules, { coordinator: "Erik", dates, moduleCount: 12 }),
      ];
      for (const message of messages) {
        expect(message.length).toBeLessThanOrEqual(4095);
        expect(message).not.toMatch(/(?:…|\.{3})$/);
        expect(message.endsWith("Se quiser, posso te passar os detalhes da matrícula.")).toBe(true);
        for (let i = 1; i <= 12; i++) expect(message).toContain(`*${i}.`);
        for (const info of ["425h", "240h práticas", "75%", "25 alunos", "Erik Halex", "Público-alvo", "Graduação em Medicina", "TCC"]) expect(message).toContain(info);
      }
      expect(messages[0]).toContain("18/12/2026 a 20/12/2026");
      for (const date of dates) expect(messages[1]).toContain(date);
    });
  }
});