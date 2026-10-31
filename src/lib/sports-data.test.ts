import { describe, it, expect } from "vitest";
import { LEAGUES, SPORTS_POLL_MS, mlToDecimal, readOdds, mapEspnEvent } from "./sports-data";

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
});