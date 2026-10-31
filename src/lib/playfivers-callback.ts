import { z } from "zod";

const identity = z.object({
  user_code: z.string().uuid(),
  agent_code: z.string().min(1).max(120),
  agent_secret: z.string().min(1).max(256),
});

export const balanceCallbackSchema = identity.extend({ type: z.literal("BALANCE") });
export const transactionCallbackSchema = identity.extend({
  type: z.literal("WinBet"),
  game_type: z.string().regex(/^[a-z_]+$/).max(40),
}).catchall(z.unknown());
export const roundCallbackSchema = z.object({
  txn_id: z.string().min(1).max(200),
  bet: z.number().finite().nonnegative().max(9999999999.99),
  win: z.number().finite().nonnegative().max(9999999999.99),
  round_id: z.string().max(200).optional(),
  provider_code: z.string().max(120).optional(),
  game_code: z.string().max(120).optional(),
  txn_type: z.string().max(60).optional(),
});

/** Missing configuration or missing credentials always denies callback access. */
export function hasCallbackCredentials(
  payload: { agent_code?: unknown; agent_secret?: unknown },
  expectedCode: string | undefined,
  expectedSecret: string | undefined,
): boolean {
  return Boolean(expectedCode && expectedSecret &&
    payload.agent_code === expectedCode && payload.agent_secret === expectedSecret);
}