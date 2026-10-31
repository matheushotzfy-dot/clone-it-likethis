import { expect, it } from "vitest";
import { canDismissDeposit } from "./deposit-navigation";

it("allows closing a deposit without requiring a copied PIX", () => {
  expect(canDismissDeposit(false)).toBe(true);
  expect(canDismissDeposit(true)).toBe(false);
});