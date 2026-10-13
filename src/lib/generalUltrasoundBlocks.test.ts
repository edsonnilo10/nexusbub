import { describe, expect, it } from "vitest";
import { generalUltrasoundBlockMessage, generalUltrasoundBlocks } from "./generalUltrasoundBlocks";
import { CourseClass } from "./courseHelpers";

describe("Datas por bloco da Pós Geral", () => {
  it("mantém 490h, com três blocos e TCC", () => {
    expect(generalUltrasoundBlocks.flatMap(b => b.courses).reduce((sum, c) => sum + c[2], 20)).toBe(490);
  });
  it("separa cidade, ano, cursos e turmas encerradas sem duplicar datas", () => {
    const courses = [{ id: "sp", mnemonic: "CM US GIOB", unit: "sao_paulo" as const }, { id: "df", mnemonic: "CM US GIOB", unit: "brasilia" as const }];
    const cls = (course_id: string, start_date: string, status: CourseClass["status"] = "proxima"): CourseClass => ({ id: start_date, course_id, start_date, end_date: start_date, status, location: null, notes: null });
    const classes = [cls("sp", "2027-03-12"), cls("sp", "2027-03-12"), cls("df", "2027-04-16"), cls("sp", "2026-12-04"), cls("sp", "2027-05-01", "encerrada")];
    const message = generalUltrasoundBlockMessage(0, "sao_paulo", 2027, courses, classes, "2026-10-13");
    expect(message.match(/12\/03\/2027/g)).toHaveLength(1);
    expect(message).not.toContain("16/04/2027");
    expect(message).not.toContain("04/12/2026");
    expect(message).not.toContain("01/05/2027");
    expect(message).toContain("Datas a confirmar.");
    expect(message).not.toContain("Doppler em Medicina Interna");
    expect(message.length).toBeLessThanOrEqual(4095);
    expect(message.endsWith("alinharmos seu cronograma.")).toBe(true);
  });
});