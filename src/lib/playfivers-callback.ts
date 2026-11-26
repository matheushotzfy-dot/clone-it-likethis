import { z } from "zod";

/**
 * Regras puras dos callbacks da PlayFivers (sem acesso a banco).
 *
 * A doc define duas chamadas para a URL de callback configurada no painel:
 *   POST {base}/webhook      { type: "BALANCE", user_code }
 *   POST {base}/api/webhook  { type: "WinBet" | "Refund", agent_code, agent_secret, user_code, game_type, [game_type]: {...} }
 *
 * O BALANCE não traz credencial nenhuma, então a base da URL leva um token
 * secreto (PLAYFIVERS_CALLBACK_TOKEN) que só a PlayFivers conhece.
 * WinBet e Refund exigem o token E as credenciais do agente.
 */

const money = z.number().finite().nonnegative().max(9_999_999_999.99);

export const balanceCallbackSchema = z.object({
  type: z.literal("BALANCE"),
  user_code: z.string().uuid(),
  agent_code: z.string().max(120).optional(),
  agent_secret: z.string().max(256).optional(),
});

export const transactionCallbackSchema = z
  .object({
    type: z.enum(["WinBet", "Refund"]),
    user_code: z.string().uuid(),
    agent_code: z.string().min(1).max(120),
    agent_secret: z.string().min(1).max(256),
    game_type: z
      .string()
      .regex(/^[a-z_]+$/)
      .max(40),
    user_balance: z.number().finite().optional(),
    game_original: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const roundCallbackSchema = z.object({
  txn_id: z.string().min(1).max(200),
  bet: money,
  win: money,
  round_id: z.string().max(200).optional(),
  provider_code: z.string().max(120).optional(),
  game_code: z.string().max(120).optional(),
  txn_type: z.string().max(60).optional(),
  type: z.string().max(40).optional(),
});

export type RoundCallback = z.infer<typeof roundCallbackSchema>;

/** Detalhes da rodada ficam na chave com o nome do game_type (doc: "slot" pode variar). */
export function extractRound(payload: Record<string, unknown>, gameType: string): unknown {
  return payload[gameType] ?? payload.slot ?? null;
}

/** Configuração faltando ou credencial errada sempre nega. */
export function hasCallbackCredentials(
  payload: { agent_code?: unknown; agent_secret?: unknown },
  expectedCode: string | undefined,
  expectedSecret: string | undefined,
): boolean {
  return Boolean(
    expectedCode &&
    expectedSecret &&
    constantTimeEqual(String(payload.agent_code ?? ""), expectedCode) &&
    constantTimeEqual(String(payload.agent_secret ?? ""), expectedSecret),
  );
}

/** Token da URL: precisa existir no servidor e ter tamanho de segredo de verdade. */
export function callbackTokenMatches(
  received: string | undefined,
  expected: string | undefined,
): boolean {
  if (!expected || expected.length < 24 || !received) return false;
  return constantTimeEqual(received, expected);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Nunca grava segredo de agente em log. */
export function sanitizeCallbackPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const {
    agent_code: _c,
    agent_secret: _s,
    agentToken: _t,
    secretKey: _k,
    ...rest
  } = payload as Record<string, unknown>;
  return rest;
}
