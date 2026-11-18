import { describe, expect, it } from "vitest";
import { formatWorkloadLine } from "./courseHelpers";

const line = (hours: number | null, breakdown: string | null) =>
  formatWorkloadLine({ workload_hours: hours, workload_breakdown: breakdown });

describe("Linha de carga horária", () => {
  it("não repete o total quando o detalhamento já começa com ele (Punção Vascular)", () => {
    expect(line(10, "10h — 2h teóricas + 8h práticas")).toBe("10h — 2h teóricas + 8h práticas");
  });

  it("normaliza '48 horas:' em vez de duplicar (Colposcopia)", () => {
    expect(line(48, "48 horas: 28h teóricas e 20h práticas")).toBe("48h — 28h teóricas e 20h práticas");
  });

  it("normaliza '25h:' em vez de duplicar (Avaliação Multiparamétrica do Fígado)", () => {
    expect(line(25, "25h: 11h teóricas + 14h práticas, presencial")).toBe(
      "25h — 11h teóricas + 14h práticas, presencial",
    );
  });

  it("mantém a divisão quando o número inicial não é o total (Doppler em GO)", () => {
    expect(line(30, "10h teóricas + 20h práticas")).toBe("30h — 10h teóricas + 20h práticas");
  });

  it("mantém a divisão quando o total é outro (Pós em Dor)", () => {
    expect(line(360, "120h teóricas e 240h práticas (12 módulos presenciais)")).toBe(
      "360h — 120h teóricas e 240h práticas (12 módulos presenciais)",
    );
  });

  it("mostra só o total quando não há detalhamento", () => {
    expect(line(10, null)).toBe("10h");
    expect(line(10, "   ")).toBe("10h");
  });

  it("não deixa a linha vazia quando o detalhamento é só o total", () => {
    expect(line(10, "10h")).toBe("10h");
  });

  it("avisa quando a carga não foi cadastrada", () => {
    expect(line(null, null)).toBe("Carga horária a confirmar");
  });
});
