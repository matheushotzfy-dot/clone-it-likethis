import { describe, expect, it } from "vitest";
import { PF_DIRECT_BASE, resolvePFEndpoint } from "./playfivers-endpoint";

describe("resolvePFEndpoint", () => {
  it("goes direct to PlayFivers when no relay is configured", () => {
    expect(resolvePFEndpoint(undefined, undefined)).toEqual({ base: PF_DIRECT_BASE, headers: {}, viaProxy: false });
  });

  it("goes direct when the relay key is missing", () => {
    expect(resolvePFEndpoint("http://1.2.3.4:8787", "").viaProxy).toBe(false);
  });

  it("routes through the fixed-IP relay with its key", () => {
    expect(resolvePFEndpoint("http://1.2.3.4:8787/", "k123")).toEqual({
      base: "http://1.2.3.4:8787",
      headers: { "X-Proxy-Key": "k123" },
      viaProxy: true,
    });
  });
});
