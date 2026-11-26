import { describe, expect, it } from "vitest";
import {
  catalogCategory,
  defaultSortOrder,
  isOfficialProvider,
  providerLabel,
} from "./pf-catalog-rules";

describe("catalog rules", () => {
  it("only lets official providers in", () => {
    expect(isOfficialProvider("OFICIAL - PG SOFT")).toBe(true);
    expect(isOfficialProvider("oficial-Evolution Live")).toBe(true);
    expect(isOfficialProvider("PG SOFT")).toBe(false);
    expect(isOfficialProvider("PGSOFT ORIGINAL")).toBe(false);
  });
  it("cleans provider names", () => {
    expect(providerLabel("OFICIAL - PG SOFT")).toBe("PG Soft");
    expect(providerLabel("OFICIAL - PRAGMATIC SLOTS")).toBe("Pragmatic Play");
    expect(providerLabel("OFICIAL - PRAGMATIC LIVE")).toBe("Pragmatic Live");
    expect(providerLabel("OFICIAL - EVOLUTION LIVE")).toBe("Evolution");
  });
  it("puts the Brazilian favourites first", () => {
    expect(defaultSortOrder("Fortune Tiger", "OFICIAL - PG SOFT")).toBe(10);
    expect(defaultSortOrder("Fortune Rabbit", "OFICIAL - PG SOFT")).toBe(20);
    expect(defaultSortOrder("Fortune Tiger", "OFICIAL - SOME CLONE STUDIO")).toBe(1000);
    expect(defaultSortOrder("Obscure Slot", "OFICIAL - PG SOFT")).toBe(1000);
  });
  it("classifies live, crash and table games", () => {
    expect(catalogCategory("Aviator", "OFICIAL - SPRIBE", "aviator")).toBe("crash");
    expect(catalogCategory("Crazy Time", "OFICIAL - EVOLUTION LIVE", "x")).toBe("live");
    expect(catalogCategory("Fortune Tiger", "OFICIAL - PG SOFT", "126")).toBe("slot");
  });
});
