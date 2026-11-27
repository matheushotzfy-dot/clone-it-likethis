import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const money = () => import("./money.server");

export type LedgerKind =
  | "opening"
  | "deposit"
  | "withdrawal_hold"
  | "withdrawal_release"
  | "casino_bet"
  | "casino_win"
  | "casino_refund"
  | "sports_stake"
  | "sports_payout"
  | "sports_refund"
  | "adjustment";

export interface LedgerEntry {
  id: number;
  kind: LedgerKind;
  amount: number;
  balance_after: number;
  description: string | null;
  ref_table: string | null;
  ref_id: string | null;
  created_at: string;
}

/** Saldo, valor reservado em saques pendentes e status da conta. */
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: pending }, { data: limits }, settingsRows] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("balance,is_frozen,freeze_reason,cpf,full_name,birth_date")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "withdrawal")
          .eq("status", "pending"),
        supabase
          .from("rg_limits")
          .select("self_excluded_until")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("app_settings").select("key,value"),
      ]);
    const { parseSettings } = await money();
    const s = parseSettings((settingsRows.data ?? []) as { key: string; value: unknown }[]);
    const held = (pending ?? []).reduce((a, t) => a + Number(t.amount), 0);
    const excludedUntil =
      limits?.self_excluded_until && new Date(limits.self_excluded_until) > new Date()
        ? limits.self_excluded_until
        : null;
    return {
      balance: Number(profile?.balance ?? 0),
      held: Math.round(held * 100) / 100,
      frozen: !!profile?.is_frozen,
      freezeReason: profile?.freeze_reason ?? null,
      selfExcludedUntil: excludedUntil,
      hasCpf: !!profile?.cpf,
      realMoney: s.real_money_enabled,
      testPayments: !s.real_money_enabled && s.active_gateway === "teste",
      limits: {
        minDeposit: s.min_deposit,
        maxDeposit: s.max_deposit,
        minWithdraw: s.min_withdraw,
        maxWithdraw: s.max_withdraw,
        withdrawFeePct: s.withdrawal_fee_pct,
      },
    };
  });

/** Extrato completo (ledger), paginado por id. */
export const listMyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        before: z.number().int().positive().optional(),
        kind: z.enum(["all", "money", "casino", "sports"]).default("all"),
        limit: z.number().int().min(10).max(100).default(40),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("wallet_ledger")
      .select("id,kind,amount,balance_after,description,ref_table,ref_id,created_at")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(data.limit);
    if (data.before) q = q.lt("id", data.before);
    if (data.kind === "money")
      q = q.in("kind", [
        "deposit",
        "withdrawal_hold",
        "withdrawal_release",
        "adjustment",
        "opening",
      ]);
    if (data.kind === "casino") q = q.in("kind", ["casino_bet", "casino_win", "casino_refund"]);
    if (data.kind === "sports")
      q = q.in("kind", ["sports_stake", "sports_payout", "sports_refund"]);
    const { data: rows, error } = await q;
    if (error) throw new Error("Não foi possível carregar o extrato");
    const entries = (rows ?? []).map((r) => ({
      ...r,
      amount: Number(r.amount),
      balance_after: Number(r.balance_after),
    })) as LedgerEntry[];
    return {
      entries,
      nextBefore: entries.length === data.limit ? entries[entries.length - 1].id : null,
    };
  });

/** Depósitos e saques com o status de cada um. */
export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("transactions")
      .select("id,type,status,amount,fee,description,pix_key,created_at,kyc_required")
      .eq("user_id", userId)
      .in("type", ["deposit", "withdrawal"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Não foi possível carregar seus pagamentos");
    const kycIds = (data ?? []).filter((t) => t.kyc_required).map((t) => t.id);
    const latest = new Map<string, { status: string; rejection_reason: string | null }>();
    if (kycIds.length) {
      const { data: subs } = await supabase
        .from("kyc_submissions")
        .select("transaction_id,status,rejection_reason,created_at")
        .in("transaction_id", kycIds)
        .order("created_at", { ascending: false });
      for (const sub of subs ?? [])
        if (sub.transaction_id && !latest.has(sub.transaction_id))
          latest.set(sub.transaction_id, sub);
    }
    return (data ?? []).map((t) => ({
      ...t,
      amount: Number(t.amount),
      fee: Number(t.fee ?? 0),
      kyc_submission: latest.get(t.id) ?? null,
    }));
  });

/** Rodadas de cassino do jogador. */
export const listMyCasinoRounds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ before: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("game_rounds")
      .select(
        "id,txn_id,round_id,provider,game_code,game_type,bet,win,after_balance,status,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error("Não foi possível carregar suas rodadas");
    const codes = [...new Set((rows ?? []).map((r) => r.game_code).filter(Boolean))] as string[];
    const { data: games } = codes.length
      ? await supabase
          .from("games")
          .select("game_code,name,provider,image_url")
          .in("game_code", codes)
      : {
          data: [] as {
            game_code: string;
            name: string;
            provider: string;
            image_url: string | null;
          }[],
        };
    const byCode = new Map((games ?? []).map((g) => [g.game_code, g]));
    return (rows ?? []).map((r) => ({
      ...r,
      bet: Number(r.bet),
      win: Number(r.win),
      after_balance: r.after_balance === null ? null : Number(r.after_balance),
      game: r.game_code ? (byCode.get(r.game_code) ?? null) : null,
    }));
  });

/** Apostas esportivas do jogador. */
export const listMySportsBets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["all", "open", "settled"]).default("all") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("sports_bets")
      .select(
        "id,event_id,league,league_name,home,away,starts_at,pick,odd,stake,potential_payout,status,score_home,score_away,settled_at,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status === "open") q = q.eq("status", "open");
    if (data.status === "settled") q = q.neq("status", "open");
    const { data: rows, error } = await q;
    if (error) throw new Error("Não foi possível carregar suas apostas");
    return (rows ?? []).map((b) => ({
      ...b,
      odd: Number(b.odd),
      stake: Number(b.stake),
      potential_payout: Number(b.potential_payout),
    }));
  });

const withdrawalSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  requestId: z.string().uuid(),
});

/**
 * Saque via Pix para a chave CPF do próprio titular.
 * O valor sai do saldo na hora (reserva) e volta se o saque for recusado.
 */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withdrawalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const m = await money();
    const { settings: s, test } = await m.assertMoneyAllowed("withdrawal");
    await m.assertIdentity(userId);
    const amount = m.roundMoney(data.amount);
    if (amount < s.min_withdraw) throw new Error(`Saque mínimo: R$ ${s.min_withdraw.toFixed(2)}`);
    if (amount > s.max_withdraw) throw new Error(`Saque máximo: R$ ${s.max_withdraw.toFixed(2)}`);

    const admin = await m.getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("cpf,full_name,balance")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Conta não encontrada.");
    const cpf = m.onlyDigits(profile.cpf);
    if (!m.isValidCpf(cpf)) throw new Error("Cadastre um CPF válido no seu perfil antes de sacar.");
    if (Number(profile.balance) < amount) throw new Error("Saldo insuficiente.");

    // Mesmo requestId = mesmo pedido (clique duplo não cria dois saques).
    const externalId = `wd-${data.requestId}`;
    const { data: existing } = await admin
      .from("transactions")
      .select("id,status")
      .eq("gateway_external_id", externalId)
      .maybeSingle();
    if (existing) return { ok: true, transactionId: existing.id, status: existing.status };

    // A taxa fica gravada no pedido: o jogador recebe amount - fee, mesmo que a taxa mude depois.
    const fee = Math.min(amount, m.roundMoney((amount * s.withdrawal_fee_pct) / 100));
    const { data: tx, error } = await admin
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal",
        amount,
        fee,
        status: "pending",
        pix_key: `cpf:${cpf}`,
        gateway_external_id: externalId,
        description: test ? "Saque via Pix (teste)" : "Saque via Pix",
        is_test: test,
        gateway: test ? "teste" : s.active_gateway,
      })
      .select("id,status")
      .single();
    if (error)
      throw new Error(m.friendlyDbError(error.message, "Não foi possível solicitar o saque."));
    return { ok: true, transactionId: tx.id, status: tx.status };
  });

/** Limites e autoexclusão do próprio jogador. */
export const getMyLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("rg_limits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? null;
  });

const limitValue = z.number().positive().max(10_000_000).nullable();

export const setMyLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        deposit_daily: limitValue,
        deposit_weekly: limitValue,
        deposit_monthly: limitValue,
        loss_daily: limitValue,
        loss_weekly: limitValue,
        loss_monthly: limitValue,
        bets_daily: z.number().int().min(1).max(100_000).nullable(),
        session_minutes: z
          .number()
          .int()
          .min(10)
          .max(24 * 60)
          .nullable(),
        session_alert_minutes: z
          .union([
            z.literal(15),
            z.literal(30),
            z.literal(45),
            z.literal(60),
            z.literal(90),
            z.literal(120),
          ])
          .nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: result } = await context.supabase.rpc("rg_set_limits", {
      p_deposit_daily: data.deposit_daily,
      p_deposit_weekly: data.deposit_weekly,
      p_deposit_monthly: data.deposit_monthly,
      p_loss_daily: data.loss_daily,
      p_loss_weekly: data.loss_weekly,
      p_loss_monthly: data.loss_monthly,
      p_bets_daily: data.bets_daily,
      p_session_minutes: data.session_minutes,
      p_session_alert_minutes: data.session_alert_minutes,
    });
    if (error) {
      const { friendlyDbError } = await money();
      throw new Error(friendlyDbError(error.message, "Não foi possível salvar seus limites."));
    }
    return result as {
      applied: Record<string, number | null>;
      pending: Record<string, number | null>;
    };
  });

export const selfExclude = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        days: z.union([
          z.literal(1),
          z.literal(7),
          z.literal(30),
          z.literal(90),
          z.literal(180),
          z.literal(365),
          z.literal(3650),
        ]),
        reason: z.string().trim().max(300).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: until, error } = await context.supabase.rpc("rg_self_exclude", {
      p_days: data.days,
      p_reason: data.reason,
    });
    if (error) {
      const { friendlyDbError } = await money();
      throw new Error(friendlyDbError(error.message, "Não foi possível ativar a autoexclusão."));
    }
    return { until: until as string };
  });
