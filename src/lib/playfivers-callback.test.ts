import { describe, expect, it } from "vitest";
import { hasCallbackCredentials, roundCallbackSchema } from "./playfivers-callback";

describe("PlayFivers callback validation", () => {
  it("rejects missing agent authentication", () => {
    expect(hasCallbackCredentials({}, "test-agent", "test-secret")).toBe(false);
  });
  it("rejects missing server configuration", () => {
    expect(
      hasCallbackCredentials(
        { agent_code: "test-agent", agent_secret: "test-secret" },
        undefined,
        undefined,
      ),
    ).toBe(false);
  });
  it("rejects incorrect agent authentication", () => {
    expect(
      hasCallbackCredentials(
        { agent_code: "test-agent", agent_secret: "incorrect" },
        "test-agent",
        "test-secret",
      ),
    ).toBe(false);
  });
  it("accepts matching authentication", () => {
    expect(
      hasCallbackCredentials(
        { agent_code: "test-agent", agent_secret: "test-secret" },
        "test-agent",
        "test-secret",
      ),
    ).toBe(true);
  });
  it("rejects negative bets rather than crediting them", () => {
    expect(roundCallbackSchema.safeParse({ txn_id: "round-1", bet: -1, win: 0 }).success).toBe(
      false,
    );
  });
  it("rejects nonnumeric or missing money fields", () => {
    expect(roundCallbackSchema.safeParse({ txn_id: "round-1", bet: "10", win: 0 }).success).toBe(
      false,
    );
    expect(roundCallbackSchema.safeParse({ txn_id: "round-1", bet: 10 }).success).toBe(false);
  });
});
import {
  callbackTokenMatches,
  extractRound,
  sanitizeCallbackPayload,
  transactionCallbackSchema,
  balanceCallbackSchema,
} from "./playfivers-callback";

describe("PlayFivers callback routing", () => {
  const token = "a".repeat(32);
  it("requires a long configured token and an exact match", () => {
    expect(callbackTokenMatches(token, token)).toBe(true);
    expect(callbackTokenMatches(token, undefined)).toBe(false);
    expect(callbackTokenMatches("short", "short")).toBe(false);
    expect(callbackTokenMatches(`${token}x`, token)).toBe(false);
    expect(callbackTokenMatches(undefined, token)).toBe(false);
  });
  it("accepts the BALANCE body exactly as documented (no agent fields)", () => {
    expect(
      balanceCallbackSchema.safeParse({
        type: "BALANCE",
        user_code: "6f1c1f5e-4b0a-4c2b-9a51-2f9d2b9a7c11",
      }).success,
    ).toBe(true);
    expect(
      balanceCallbackSchema.safeParse({ type: "BALANCE", user_code: "not-a-uuid" }).success,
    ).toBe(false);
  });
  it("accepts WinBet and Refund but requires agent credentials", () => {
    const base = {
      user_code: "6f1c1f5e-4b0a-4c2b-9a51-2f9d2b9a7c11",
      agent_code: "A",
      agent_secret: "S",
      game_type: "slot",
      slot: {},
    };
    expect(transactionCallbackSchema.safeParse({ ...base, type: "WinBet" }).success).toBe(true);
    expect(transactionCallbackSchema.safeParse({ ...base, type: "Refund" }).success).toBe(true);
    expect(
      transactionCallbackSchema.safeParse({ ...base, type: "WinBet", agent_secret: undefined })
        .success,
    ).toBe(false);
    expect(transactionCallbackSchema.safeParse({ ...base, type: "Bonus" }).success).toBe(false);
  });
  it("reads round details from the game_type key and falls back to slot", () => {
    expect(extractRound({ live: { txn_id: "1" } }, "live")).toEqual({ txn_id: "1" });
    expect(extractRound({ slot: { txn_id: "2" } }, "crash")).toEqual({ txn_id: "2" });
  });
  it("never keeps agent secrets in logs", () => {
    expect(sanitizeCallbackPayload({ agent_code: "A", agent_secret: "S", user_code: "u" })).toEqual(
      { user_code: "u" },
    );
  });
});
