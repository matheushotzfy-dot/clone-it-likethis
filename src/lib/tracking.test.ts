import { describe, expect, it } from "vitest";
import { getTrackingMetadata } from "./tracking";

describe("advertising metadata disabled", () => {
  it("returns no advertising or visitor identifiers at signup", () => {
    expect(getTrackingMetadata()).toEqual({});
  });
});