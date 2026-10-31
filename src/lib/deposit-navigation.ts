/** Closing a PIX screen never cancels the pending payment or its later credit. */
export function canDismissDeposit(): boolean {
  return true;
}