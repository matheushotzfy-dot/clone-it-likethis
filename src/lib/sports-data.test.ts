import { describe, it, expect } from "vitest";
import { LEAGUES, SPORTS_POLL_MS, mlToDecimal, readOdds, mapEspnEvent, validateBetQuote, type SportEvent } from "./sports-data";

describe("real sports source rules", () => {
  it("polls every five seconds", () => { expect(SPORTS_POLL_MS).toBe(5000); });
  it("includes the four Brazilian divisions and verified state championships", () => {
    expect(LEAGUES.filter((l) => l.brazil).map((l) => l.id)).toEqual([
      "bra.1", "bra.2", "bra.3", "bra.4", "bra.copa_do_brazil", "bra.supercopa_do_brazil",
      "bra.camp.paulista", "bra.camp.carioca", "bra.camp.gaucho", "bra.camp.mineiro",
    ]);
  });
  it("does not manufacture missing odds", () => {
    expect(readOdds(undefined, false)).toBeNull();
    expect(mlToDecimal(null)).toBeNull();
  });
  it("converts actual American prices without changing their value", () => {
    expect(mlToDecimal("+120")).toBe(2.2);
    expect(mlToDecimal(-200)).toBe(1.5);
  });
  it("never presents scoreboard pre-game prices as in-play odds", () => {
    expect(readOdds({ moneyline: { home: { current: { odds: 120 } }, away: { current: { odds: 215 } } } }, true)).toBeNull();
  });
  it("does not invent teams for malformed source events", () => {
    expect(mapEspnEvent({ id: "1", date: "2026-10-31" }, LEAGUES[0], "2026-10-31T14:05:00Z")).toBeNull();
  });
  const quote: SportEvent = { id: "1", league: "bra.1", leagueLabel: "Série A", sport: "soccer", start: "2026-10-31T19:00:00Z", state: "pre", clock: "", home: { name: "Coritiba" }, away: { name: "Vitória" }, odds: { home: 2.2, draw: 3.45, away: 3.15 }, oddsSource: "DraftKings", oddsKind: "pre", fetchedAt: "2026-10-31T14:05:00Z" };
  const now = Date.parse(quote.fetchedAt);
  it("rejects a submitted price that differs from the source", () => {
    expect(() => validateBetQuote(quote, "home", 5, now)).toThrow("A odd mudou");
    expect(validateBetQuote(quote, "home", 2.2, now)).toBe(2.2);
  });
  it("rejects stale source quotes", () => { expect(() => validateBetQuote(quote, "home", 2.2, now + 15001)).toThrow("Mercado indisponível"); });
  it("rejects in-play betting without an in-play feed", () => { expect(() => validateBetQuote({ ...quote, state: "in" }, "home", 2.2, now)).toThrow("Mercado indisponível"); });
});