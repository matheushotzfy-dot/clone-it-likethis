import { describe, expect, it } from "vitest";
import { canAccessGames } from "./game-access";

describe("game access with credited balance", () => {
  it("allows R$100 without a deposit transaction", () => {
    expect(canAccessGames({ balance: 100, hasDeposited: false })).toBe(true);
  });
  it("keeps approved-deposit access", () => {
    expect(canAccessGames({ balance: 0, hasDeposited: true })).toBe(true);
  });
  it("requires funding when there is no balance or approved deposit", () => {
    expect(canAccessGames({ balance: 0, hasDeposited: false })).toBe(false);
  });
  it("does not treat a missing profile or invalid balance as funding", () => {
    expect(canAccessGames(undefined)).toBe(false);
    expect(canAccessGames({ balance: "invalid" })).toBe(false);
    expect(canAccessGames({ balance: Infinity })).toBe(false);
    expect(canAccessGames({ balance: -1 })).toBe(false);
  });
});