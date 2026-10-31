import { describe, it, expect } from "vitest";
import { decideDeposit } from "./veopag.server";

describe("decideDeposit", () => {
  it("approves a completed PIX paid in full", () => expect(decideDeposit("COMPLETED", 50, 50)).toBe("approved"));
  it("does not approve an underpaid PIX", () => expect(decideDeposit("COMPLETED", 49.5, 50)).toBe("pending"));
  it("keeps waiting while pending", () => expect(decideDeposit("PENDING", 50, 50)).toBe("pending"));
  it("rejects failed PIX", () => expect(decideDeposit("FAILED", 0, 50)).toBe("rejected"));
});
