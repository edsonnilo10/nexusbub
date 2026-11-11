import { describe, it, expect } from "vitest";
import { unicredFinancingMessage, normalizeOptions } from "./unicredMessage";

describe("unicred message", () => {
  it("shows cash value and only installment amounts, sorted", () => {
    const m = unicredFinancingMessage({ courseName: "GIOB + TRVG", workload: "90h", year: 2027, cashValue: 14338,
      options: [{ parcelas: 15, valor: 1130.5 }, { parcelas: 14, valor: 1202.4 }] });
    expect(m).toContain("*Valor à vista:* R$ 14.338,00");
    expect(m.indexOf("14x de R$ 1.202,40")).toBeLessThan(m.indexOf("15x de R$ 1.130,50"));
    expect(m).toContain("45 dias");
    expect(m).not.toMatch(/juros|IOF|CET/i);
  });
  it("dedupes by installment count", () => {
    expect(normalizeOptions([{ parcelas: 14, valor: 1 }, { parcelas: 14, valor: 2 }])).toEqual([{ parcelas: 14, valor: 2 }]);
  });
});
