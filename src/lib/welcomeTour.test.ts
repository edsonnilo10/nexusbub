import { beforeEach, describe, expect, it } from "vitest";
import { isTourHidden, setTourHidden } from "./welcomeTour";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("escolha do tutorial de boas-vindas", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("começa mostrando o tutorial (ninguém escolheu ainda)", () => {
    expect(isTourHidden(USER)).toBe(false);
  });

  it("marca a escolha de não mostrar mais", () => {
    setTourHidden(USER, true);
    expect(isTourHidden(USER)).toBe(true);
  });

  it("volta a mostrar quando o usuário desmarca", () => {
    setTourHidden(USER, true);
    setTourHidden(USER, false);
    expect(isTourHidden(USER)).toBe(false);
  });

  it("a escolha de um usuário não afeta outro usuário", () => {
    setTourHidden(USER, true);
    expect(isTourHidden(OTHER)).toBe(false);
  });

  it("sem usuário não há escolha salva", () => {
    setTourHidden(undefined, true);
    expect(isTourHidden(undefined)).toBe(false);
    expect(isTourHidden(null)).toBe(false);
  });
});
