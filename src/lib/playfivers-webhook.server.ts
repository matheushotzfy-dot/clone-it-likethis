// Server-only: processa os callbacks da PlayFivers (saldo, aposta/ganho, estorno).
// Toda mudança de saldo acontece nas funções do banco, que são idempotentes
// por txn_id; aqui só validamos, roteamos e registramos.
import {
  balanceCallbackSchema,
  callbackTokenMatches,
  extractRound,
  hasCallbackCredentials,
  roundCallbackSchema,
  sanitizeCallbackPayload,
  transactionCallbackSchema,
} from "./playfivers-callback";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function reply(body: { balance: number; msg: string }, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export function pfOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

interface LogEntry {
  kind: string;
  userId?: string | null;
  txnId?: string | null;
  status: number;
  result: string;
  balance?: number | null;
  providerBalance?: number | null;
  payload?: unknown;
}

async function log(entry: LogEntry) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pf_callback_log").insert({
      kind: entry.kind,
      user_id: entry.userId ?? null,
      txn_id: entry.txnId ?? null,
      http_status: entry.status,
      result: entry.result,
      balance: entry.balance ?? null,
      provider_balance: entry.providerBalance ?? null,
      payload: sanitizeCallbackPayload(entry.payload) as never,
    });
  } catch (error) {
    console.error("pf_callback_log insert failed", error);
  }
}

async function currentBalance(userId: string): Promise<number | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
  return data ? Number(data.balance) : null;
}

/**
 * @param urlToken  token da URL (segmento $token); undefined nas rotas antigas
 * @param expect    "balance" para {base}/webhook, "transaction" para {base}/api/webhook,
 *                  "any" nas rotas antigas (aceita os dois pelo campo type)
 */
export async function handlePlayFiversCallback(
  request: Request,
  urlToken: string | undefined,
  expect: "balance" | "transaction" | "any",
): Promise<Response> {
  const expectedToken = process.env.PLAYFIVERS_CALLBACK_TOKEN;
  const agentCode = process.env.PLAYFIVERS_AGENT_CODE;
  const agentSecret = process.env.PLAYFIVERS_SECRET_KEY;

  let payload: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    payload = parsed as Record<string, unknown>;
  } catch {
    await log({ kind: "unknown", status: 400, result: "bad_json" });
    return reply({ balance: 0, msg: "BAD_JSON" }, 400);
  }

  const type = typeof payload.type === "string" ? payload.type : "unknown";
  const tokenOk = callbackTokenMatches(urlToken, expectedToken);

  // ---------------------------------------------------------------- BALANCE
  if (type === "BALANCE" && expect !== "transaction") {
    const parsed = balanceCallbackSchema.safeParse(payload);
    const credsOk = hasCallbackCredentials(payload, agentCode, agentSecret);
    if (!parsed.success || !(tokenOk || credsOk)) {
      await log({ kind: "BALANCE", status: 401, result: "unauthorized", payload });
      return reply({ balance: 0, msg: "INVALID_AGENT" }, 401);
    }
    const balance = await currentBalance(parsed.data.user_code);
    if (balance === null) {
      await log({ kind: "BALANCE", userId: null, status: 404, result: "user_not_found", payload });
      return reply({ balance: 0, msg: "INVALID_USER" }, 404);
    }
    return reply({ balance, msg: "" }, 200);
  }

  // ------------------------------------------------------- WinBet / Refund
  if ((type === "WinBet" || type === "Refund") && expect !== "balance") {
    const parsed = transactionCallbackSchema.safeParse(payload);
    // Rotas novas: token + credenciais. Rotas antigas (sem token): só credenciais.
    const authorized =
      parsed.success &&
      hasCallbackCredentials(parsed.data, agentCode, agentSecret) &&
      (urlToken === undefined || tokenOk);
    if (!parsed.success || !authorized) {
      await log({ kind: type, status: 401, result: "unauthorized", payload });
      return reply({ balance: 0, msg: "INVALID_AGENT" }, 401);
    }
    const body = parsed.data;
    const round = roundCallbackSchema.safeParse(extractRound(payload, body.game_type));
    if (!round.success) {
      await log({
        kind: type,
        userId: body.user_code,
        status: 400,
        result: "invalid_round",
        payload,
      });
      return reply(
        { balance: (await currentBalance(body.user_code)) ?? 0, msg: "INVALID_TRANSACTION" },
        400,
      );
    }
    const r = round.data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safePayload = sanitizeCallbackPayload(payload);

    if (type === "Refund") {
      const { data, error } = await supabaseAdmin.rpc("apply_playfivers_refund", {
        p_user_id: body.user_code,
        p_txn_id: r.txn_id,
        p_payload: safePayload as never,
      });
      if (error) {
        const notFound = error.message.includes("USER_NOT_FOUND");
        await log({
          kind: type,
          userId: body.user_code,
          txnId: r.txn_id,
          status: notFound ? 404 : 500,
          result: notFound ? "user_not_found" : "error",
          payload,
        });
        if (!notFound) console.error("PlayFivers refund error", error.message);
        return reply(
          { balance: 0, msg: notFound ? "INVALID_USER" : "ERROR_INTERNAL" },
          notFound ? 404 : 500,
        );
      }
      const row = (data as { balance: number; result: string }[] | null)?.[0];
      const balance = Number(row?.balance ?? 0);
      // not_found / insufficient: responde 200 (não adianta o provedor repetir)
      // e o caso fica marcado no log para revisão no admin.
      await log({
        kind: type,
        userId: body.user_code,
        txnId: r.txn_id,
        status: 200,
        result: row?.result ?? "unknown",
        balance,
        providerBalance: body.user_balance,
        payload,
      });
      return reply({ balance, msg: "" }, 200);
    }

    const { data: newBalance, error } = await supabaseAdmin.rpc("apply_playfivers_transaction", {
      p_user_id: body.user_code,
      p_txn_id: r.txn_id,
      p_round_id: r.round_id ?? "",
      p_provider: r.provider_code ?? "",
      p_game_code: r.game_code ?? "",
      p_game_type: body.game_type,
      p_txn_type: r.txn_type ?? "",
      p_bet: r.bet,
      p_win: r.win,
      p_payload: safePayload as never,
    });

    if (error) {
      const msg = error.message;
      const current = (await currentBalance(body.user_code)) ?? 0;
      let status = 500;
      let code = "ERROR_INTERNAL";
      let result = "error";
      if (msg.includes("USER_NOT_FOUND")) {
        status = 404;
        code = "INVALID_USER";
        result = "user_not_found";
      } else if (msg.includes("INSUFFICIENT_BALANCE")) {
        status = 400;
        code = "INSUFFICIENT_BALANCE";
        result = "insufficient";
      } else if (msg.includes("USER_FROZEN")) {
        status = 400;
        code = "USER_BLOCKED";
        result = "frozen";
      } else if (msg.includes("SELF_EXCLUDED")) {
        status = 400;
        code = "USER_BLOCKED";
        result = "self_excluded";
      } else if (msg.includes("LIMIT_LOSS_DAILY")) {
        status = 400;
        code = "LIMIT_REACHED";
        result = "loss_limit";
      } else console.error("PlayFivers transaction error", msg);
      await log({
        kind: type,
        userId: body.user_code,
        txnId: r.txn_id,
        status,
        result,
        balance: current,
        providerBalance: body.user_balance,
        payload,
      });
      return reply({ balance: current, msg: code }, status);
    }

    // Rodada aceita já fica em game_rounds + wallet_ledger; o log guarda só o que foge do normal.
    const balance = Number(newBalance ?? 0);
    return reply({ balance, msg: "" }, 200);
  }

  await log({ kind: type, status: 400, result: "unexpected_type", payload });
  return reply({ balance: 0, msg: "INVALID_TYPE" }, 400);
}
