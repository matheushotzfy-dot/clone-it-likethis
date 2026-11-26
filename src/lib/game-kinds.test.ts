import { describe, expect, it } from "vitest";
import { gameKind, kindOrFilter } from "./game-kinds";
import { games } from "./games";

describe("gameKind", () => {
  it("separa roletas, game shows, baccarat e blackjack pelo nome", () => {
    expect(gameKind("Roleta Brasileira")).toBe("roulette");
    expect(gameKind("XXXtreme Lightning Roulette")).toBe("roulette");
    expect(gameKind("Crazy Time Brasil")).toBe("gameshow");
    expect(gameKind("Mega Bola da Sorte")).toBe("gameshow");
    expect(gameKind("Bac Bo Ao Vivo")).toBe("baccarat");
    expect(gameKind("Fan Tan")).toBe("baccarat");
    expect(gameKind("Blackjack 5000")).toBe("blackjack");
  });
  it("não marca slots comuns", () => {
    expect(gameKind("Fortune Tiger")).toBeNull();
    expect(gameKind("Gates of Olympus 1000")).toBeNull();
  });
  it("ignora acento e caixa", () => {
    expect(gameKind("ROLETA RÁPIDA")).toBe("roulette");
  });
  it("monta o filtro PostgREST sem vírgula solta", () => {
    expect(kindOrFilter("baccarat")).toBe(
      "name.ilike.%baccarat%,name.ilike.%bac bo%,name.ilike.%dragon tiger%,name.ilike.%fan tan%",
    );
  });
});

describe("vitrine", () => {
  it("não tem id repetido e só usa provedores com nome do catálogo", () => {
    const ids = games.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(games.some((g) => /pixbet/i.test(g.provider + g.name))).toBe(false);
    expect(games.some((g) => g.provider === "Pragmatic")).toBe(false);
  });
});
