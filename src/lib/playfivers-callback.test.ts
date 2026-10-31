import { describe, expect, it } from "vitest";
import { hasCallbackCredentials, roundCallbackSchema } from "./playfivers-callback";

describe("PlayFivers callback validation", () => {
  it("rejects missing agent authentication", () => {
    expect(hasCallbackCredentials({}, "test-agent", "test-secret")).toBe(false);
  });
  it("rejects missing server configuration", () => {
    expect(hasCallbackCredentials({ agent_code: "test-agent", agent_secret: "test-secret" }, undefined, undefined)).toBe(false);
  });
  it("rejects incorrect agent authentication", () => {
    expect(hasCallbackCredentials({ agent_code: "test-agent", agent_secret: "incorrect" }, "test-agent", "test-secret")).toBe(false);
  });
  it("accepts matching authentication", () => {
    expect(hasCallbackCredentials({ agent_code: "test-agent", agent_secret: "test-secret" }, "test-agent", "test-secret")).toBe(true);
  });
  it("rejects negative bets rather than crediting them", () => {
    expect(roundCallbackSchema.safeParse({ txn_id: "round-1", bet: -1, win: 0 }).success).toBe(false);
  });
  it("rejects nonnumeric or missing money fields", () => {
    expect(roundCallbackSchema.safeParse({ txn_id: "round-1", bet: "10", win: 0 }).success).toBe(false);
    expect(roundCallbackSchema.safeParse({ txn_id: "round-1", bet: 10 }).success).toBe(false);
  });
});