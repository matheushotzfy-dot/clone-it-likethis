import { describe, expect, it } from "vitest";
import { hasGameImage } from "./game-image";

describe("games without loaded artwork", () => {
  it("excludes missing and failed images while keeping valid artwork", () => {
    expect(hasGameImage(undefined)).toBe(false);
    expect(hasGameImage("   ")).toBe(false);
    expect(hasGameImage("/cover.jpg", true)).toBe(false);
    expect(hasGameImage("/cover.jpg", false)).toBe(true);
  });
});