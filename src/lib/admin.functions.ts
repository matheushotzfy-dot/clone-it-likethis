import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard";

// Todas as funções conferem o papel de admin com o cliente do próprio usuário
// (RLS + auth.uid()); o cliente de service role só entra onde o RLS não alcança
// (e-mails em auth.users, arquivos de KYC, gateways).

const uuid = z.string().uuid();

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** E-mail de cada usuário (auth.users não é exposto ao cliente). */
async function emailsFor(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const admin = await adminClient();
  if (ids.length <= 20) {
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user?.email) map.set(id, data.user.email);
      }),
    );
    return map;
  }
  const wanted = new Set(ids);
  for (let page = 1; page <= 50 && wanted.size; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users)
      if (wanted.has(u.id)) {
        map.set(u.id, u.email ?? "");
        wanted.delete(u.id);
      }
    if (users.length < 1000) break;
  }
  return map;
}

/** Busca por e-mail: devolve os ids cujo e-mail contém o termo. */
async function idsByEmail(term: string): Promise<string[]> {
  const admin = await adminClient();
  const out: string[] = [];
  const t = term.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) if (u.email?.toLowerCase().includes(t)) out.push(u.id);
    if (users.length < 1000 || out.length > 200) break;
  }
  return out;
}

async function usersById(supabase: Parameters<typeof assertAdmin>[0], ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length)
    return new Map<
      string,
      { id: string; username: string; full_name: string | null; cpf: string | null }
    >();
  const { data } = await supabase
    .from("profiles")
    .select("id,username,full_name,cpf")
    .in("id", unique);
  return new Map((data ?? []).map((u) => [u.id, u]));
}

const n = (v: unknown) => Number(v ?? 0);

// ---------------------------------------------------------------------------
// Acesso
// ---------------------------------------------------------------------------
export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------
export const getOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(90).default(14) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const since15 = new Date(Date.now() - 15 * 60_000).toISOString();
    const since24h = new Date(Date.now() - 86_400_000).toISOString();

    const [
      daily,
      pendingWd,
      pendingDep,
      kyc,
      balances,
      recon,
      launches,
      pfProblems,
      openBets,
      settings,
      recent,
    ] = await Promise.all([
      supabase.rpc("admin_daily_stats", { p_days: data.days }),
      supabase
        .from("transactions")
        .select("amount")
        .eq("type", "withdrawal")
        .eq("status", "pending"),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "deposit")
        .eq("status", "pending"),
      supabase
        .from("kyc_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("profiles").select("balance").gt("balance", 0),
      supabase.from("admin_wallet_reconciliation").select("user_id,diff").neq("diff", 0),
      supabase.from("game_launches").select("user_id").eq("ok", true).gte("created_at", since15),
      supabase
        .from("pf_callback_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h)
        .neq("result", "ok"),
      supabase.from("sports_bets").select("stake,potential_payout").eq("status", "open"),
      supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["real_money_enabled", "maintenance_mode", "casino_enabled", "sports_enabled"]),
      supabase
        .from("wallet_ledger")
        .select("id,user_id,kind,amount,balance_after,created_at")
        .order("id", { ascending: false })
        .limit(25),
    ]);
    if (daily.error) throw new Error(daily.error.message);

    const days = (daily.data ?? []).map((d) => ({
      day: d.day,
      deposits: n(d.deposits),
      depositsCount: d.deposits_count,
      withdrawals: n(d.withdrawals),
      withdrawalsCount: d.withdrawals_count,
      casinoBets: n(d.casino_bets),
      casinoWins: n(d.casino_wins),
      sportsStakes: n(d.sports_stakes),
      sportsReturns: n(d.sports_returns),
      ggr: n(d.casino_bets) - n(d.casino_wins) + n(d.sports_stakes) - n(d.sports_returns),
      adjustments: n(d.adjustments),
      signups: d.signups,
      depositors: d.depositors,
      active: d.active_players,
    }));
    const sum = (k: keyof (typeof days)[number]) => days.reduce((a, d) => a + n(d[k]), 0);
    const today = days[days.length - 1];
    const users = await usersById(
      supabase,
      (recent.data ?? []).map((r) => r.user_id),
    );
    const flags = Object.fromEntries((settings.data ?? []).map((r) => [r.key, r.value === true]));

    return {
      days,
      today,
      period: {
        deposits: sum("deposits"),
        withdrawals: sum("withdrawals"),
        ggr: sum("ggr"),
        casinoBets: sum("casinoBets"),
        sportsStakes: sum("sportsStakes"),
        signups: sum("signups"),
        adjustments: sum("adjustments"),
      },
      queues: {
        withdrawals: pendingWd.data?.length ?? 0,
        withdrawalsAmount: (pendingWd.data ?? []).reduce((a, t) => a + n(t.amount), 0),
        deposits: pendingDep.count ?? 0,
        kyc: kyc.count ?? 0,
      },
      liability: (balances.data ?? []).reduce((a, p) => a + n(p.balance), 0),
      playersWithBalance: balances.data?.length ?? 0,
      reconciliationIssues: recon.data?.length ?? 0,
      playingNow: new Set((launches.data ?? []).map((l) => l.user_id)).size,
      pfProblems24h: pfProblems.count ?? 0,
      openBets: {
        count: openBets.data?.length ?? 0,
        stakes: (openBets.data ?? []).reduce((a, b) => a + n(b.stake), 0),
        maxPayout: (openBets.data ?? []).reduce((a, b) => a + n(b.potential_payout), 0),
      },
      flags: {
        realMoney: !!flags.real_money_enabled,
        maintenance: !!flags.maintenance_mode,
        casino: flags.casino_enabled !== false,
        sports: flags.sports_enabled !== false,
      },
      recent: (recent.data ?? []).map((r) => ({
        ...r,
        amount: n(r.amount),
        balance_after: n(r.balance_after),
        user: users.get(r.user_id) ?? null,
      })),
    };
  });

// ---------------------------------------------------------------------------
// Jogadores
// ---------------------------------------------------------------------------
const playersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  filter: z.enum(["all", "balance", "depositors", "frozen", "new"]).default("all"),
  sort: z.enum(["recent", "balance", "deposits", "ggr", "last_bet"]).default("recent"),
  page: z.number().int().min(0).default(0),
});

export const listPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => playersSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const pageSize = 50;
    let q = supabase.from("admin_player_summary").select("*", { count: "exact" });

    if (data.q) {
      const term = data.q.replace(/[%_,()]/g, "");
      const digits = term.replace(/\D/g, "");
      if (term.includes("@")) {
        const ids = await idsByEmail(term);
        q = q.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      } else if (/^[0-9a-f-]{36}$/i.test(term)) {
        q = q.eq("user_id", term);
      } else if (digits.length >= 6 && digits.length === term.replace(/[.\-\s()]/g, "").length) {
        q = q.or(`cpf.ilike.%${digits}%,phone.ilike.%${digits}%`);
      } else {
        q = q.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
      }
    }
    if (data.filter === "balance") q = q.gt("balance", 0);
    if (data.filter === "depositors") q = q.gt("deposits", 0);
    if (data.filter === "frozen") q = q.eq("is_frozen", true);
    if (data.filter === "new")
      q = q.gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

    const order: Record<typeof data.sort, string> = {
      recent: "created_at",
      balance: "balance",
      deposits: "deposits",
      ggr: "ggr",
      last_bet: "last_bet_at",
    };
    q = q
      .order(order[data.sort], { ascending: false, nullsFirst: false })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const emails = await emailsFor((rows ?? []).map((r) => r.user_id!));
    return {
      total: count ?? 0,
      pageSize,
      players: (rows ?? []).map((r) => ({
        ...r,
        email: emails.get(r.user_id!) ?? "",
        balance: n(r.balance),
        deposits: n(r.deposits),
        withdrawn: n(r.withdrawn),
        ggr: n(r.ggr),
        withdraw_pending: n(r.withdraw_pending),
      })),
    };
  });

export const getPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [
      { data: profile },
      { data: summary },
      { data: limits },
      { data: roles },
      { data: recon },
      emails,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("admin_player_summary").select("*").eq("user_id", data.id).maybeSingle(),
      supabase.from("rg_limits").select("*").eq("user_id", data.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", data.id),
      supabase
        .from("admin_wallet_reconciliation")
        .select("diff,entries")
        .eq("user_id", data.id)
        .maybeSingle(),
      emailsFor([data.id]),
    ]);
    if (!profile) throw new Error("Jogador não encontrado");
    const admin = await adminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(data.id);
    return {
      profile: { ...profile, balance: n(profile.balance) },
      email: emails.get(data.id) ?? "",
      emailConfirmed: !!authUser?.user?.email_confirmed_at,
      lastSignIn: authUser?.user?.last_sign_in_at ?? null,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      summary: summary
        ? {
            deposits: n(summary.deposits),
            withdrawn: n(summary.withdrawn),
            withdrawPending: n(summary.withdraw_pending),
            casinoBets: n(summary.casino_bets),
            casinoWins: n(summary.casino_wins),
            sportsStakes: n(summary.sports_stakes),
            sportsReturns: n(summary.sports_returns),
            adjustments: n(summary.adjustments),
            ggr: n(summary.ggr),
            lastBetAt: summary.last_bet_at,
          }
        : null,
      limits: limits ?? null,
      reconciliation: { diff: n(recon?.diff), entries: recon?.entries ?? 0 },
    };
  });

const playerListSchema = z.object({ id: uuid, before: z.string().optional() });

/**
 * Ações de conta pelo admin, todas auditadas:
 * - unlock: tira o bloqueio de 3 senhas erradas (art. 36);
 * - reopen: reabre conta encerrada a pedido do titular;
 * - identity_verified / identity_rejected / identity_reset: decide a identidade do cadastro.
 */
export const playerAccountAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: uuid,
        action: z.enum([
          "unlock",
          "reopen",
          "identity_verified",
          "identity_rejected",
          "identity_reset",
        ]),
        reason: z.string().trim().max(300).optional(),
      })
      .refine((v) => v.action !== "identity_rejected" || (v.reason?.length ?? 0) >= 3, {
        message: "Escreva o motivo da recusa. O jogador vê esse texto.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (data.action === "unlock") Object.assign(patch, { failed_logins: 0, locked_at: null });
    if (data.action === "reopen") Object.assign(patch, { closed_at: null, closed_reason: null });
    if (data.action === "identity_verified")
      Object.assign(patch, { kyc_status: "verified", kyc_verified: true });
    if (data.action === "identity_rejected")
      Object.assign(patch, { kyc_status: "rejected", kyc_verified: false });
    if (data.action === "identity_reset")
      Object.assign(patch, { kyc_status: "none", kyc_verified: false });
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    if (data.action.startsWith("identity_")) {
      // Fecha envios de identidade em aberto com a mesma decisão.
      const decided = data.action === "identity_verified" ? "approved" : "rejected";
      if (data.action !== "identity_reset")
        await context.supabase
          .from("kyc_submissions")
          .update({
            status: decided,
            rejection_reason: decided === "rejected" ? data.reason! : null,
            reviewed_at: now,
            reviewed_by: context.userId,
          })
          .eq("user_id", data.userId)
          .is("transaction_id", null)
          .eq("status", "pending");
    }
    await context.supabase.rpc("admin_log", {
      p_action: `user.${data.action}`,
      p_target_user: data.userId,
      p_details: { motivo: data.reason ?? null } as never,
    });
    return { ok: true };
  });

export const listPlayerLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => playerListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("wallet_ledger")
      .select("*")
      .eq("user_id", data.id)
      .order("id", { ascending: false })
      .limit(50);
    if (data.before) q = q.lt("id", Number(data.before));
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const admins = await usersById(
      context.supabase,
      (rows ?? []).map((r) => r.created_by ?? "").filter(Boolean),
    );
    return (rows ?? []).map((r) => ({
      ...r,
      amount: n(r.amount),
      balance_before: n(r.balance_before),
      balance_after: n(r.balance_after),
      createdByName: r.created_by ? (admins.get(r.created_by)?.username ?? "admin") : null,
    }));
  });

export const listPlayerRounds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => playerListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("game_rounds")
      .select(
        "id,txn_id,round_id,provider,game_code,game_type,txn_type,bet,win,before_balance,after_balance,status,created_at,refunded_at",
      )
      .eq("user_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return withGameNames(context.supabase, rows ?? []);
  });

async function withGameNames<T extends { game_code: string | null }>(
  supabase: Parameters<typeof assertAdmin>[0],
  rows: T[],
) {
  const codes = [...new Set(rows.map((r) => r.game_code).filter(Boolean))] as string[];
  const { data: games } = codes.length
    ? await supabase.from("games").select("game_code,name,image_url").in("game_code", codes)
    : { data: [] };
  const byCode = new Map((games ?? []).map((g) => [g.game_code, g]));
  return rows.map((r) => ({ ...r, game: r.game_code ? (byCode.get(r.game_code) ?? null) : null }));
}

export const listPlayerBets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => playerListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("sports_bets")
      .select("*")
      .eq("user_id", data.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((b) => ({
      ...b,
      odd: n(b.odd),
      stake: n(b.stake),
      potential_payout: n(b.potential_payout),
    }));
  });

export const listPlayerPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => playerListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("transactions")
      .select("*")
      .eq("user_id", data.id)
      .in("type", ["deposit", "withdrawal"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((t) => ({ ...t, amount: n(t.amount) }));
  });

export const listPlayerActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => playerListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [launches, audit, kyc] = await Promise.all([
      context.supabase
        .from("game_launches")
        .select("*")
        .eq("user_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_user", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("kyc_submissions")
        .select("id,status,document_type,rejection_reason,created_at,reviewed_at,transaction_id")
        .eq("user_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    const admins = await usersById(
      context.supabase,
      (audit.data ?? []).map((a) => a.admin_id ?? ""),
    );
    return {
      launches: launches.data ?? [],
      audit: (audit.data ?? []).map((a) => ({
        ...a,
        adminName: a.admin_id ? (admins.get(a.admin_id)?.username ?? "admin") : "sistema",
      })),
      kyc: kyc.data ?? [],
    };
  });

export const adjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: uuid,
        delta: z.number().refine((v) => v !== 0 && Math.abs(v) <= 1_000_000, "Valor inválido"),
        reason: z.string().trim().min(3).max(200),
        requestId: uuid,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: balance, error } = await context.supabase.rpc("admin_adjust_balance", {
      p_user_id: data.userId,
      p_delta: data.delta,
      p_reason: data.reason,
      p_request_id: data.requestId,
    });
    if (error) {
      const { friendlyDbError } = await import("./money.server");
      throw new Error(friendlyDbError(error.message, error.message));
    }
    return { ok: true, balance: Number(balance) };
  });

export const updatePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: uuid,
        full_name: z.string().trim().min(3).max(120).optional(),
        phone: z
          .string()
          .trim()
          .regex(/^\d{10,11}$/)
          .optional(),
        birth_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        is_frozen: z.boolean().optional(),
        freeze_reason: z.string().trim().max(300).optional(),
        kyc_verified: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { userId: target, ...patch } = data;
    if (target === context.userId && patch.is_frozen)
      throw new Error("Você não pode suspender a própria conta.");
    if (patch.is_frozen === true && !patch.freeze_reason)
      throw new Error("Informe o motivo da suspensão. O jogador vê esse texto.");
    const clean: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    if (patch.is_frozen === false) clean.freeze_reason = null;
    if (patch.kyc_verified !== undefined)
      clean.kyc_status = patch.kyc_verified ? "verified" : "none";
    const { error } = await context.supabase
      .from("profiles")
      .update(clean as never)
      .eq("id", target);
    if (error) throw new Error(error.message);
    const action =
      patch.is_frozen === true
        ? "user.freeze"
        : patch.is_frozen === false
          ? "user.unfreeze"
          : "user.update";
    await context.supabase.rpc("admin_log", {
      p_action: action,
      p_target_user: target,
      p_details: patch as never,
    });
    return { ok: true };
  });

export const deletePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode apagar a própria conta.");
    const admin = await adminClient();
    const { count } = await admin
      .from("wallet_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.userId);
    if ((count ?? 0) > 0)
      throw new Error("Jogador com movimentação financeira não pode ser apagado. Use suspender.");
    const { data: p } = await admin
      .from("profiles")
      .select("username,cpf")
      .eq("id", data.userId)
      .maybeSingle();
    await admin.from("kyc_submissions").delete().eq("user_id", data.userId);
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("admin_log", {
      p_action: "user.delete",
      p_target_id: data.userId,
      p_details: { username: p?.username, cpf: p?.cpf } as never,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------
export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(["deposit", "withdrawal"]),
        status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
        page: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const pageSize = 50;
    let q = context.supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("type", data.type)
      .order("created_at", { ascending: data.status === "pending" && data.type === "withdrawal" })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);
    if (data.status !== "all")
      q = q.eq("status", data.status === "rejected" ? "rejected" : data.status);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.user_id);
    const [users, summaries] = await Promise.all([
      usersById(context.supabase, ids),
      ids.length
        ? context.supabase
            .from("admin_player_summary")
            .select("user_id,balance,deposits,withdrawn,ggr,is_frozen")
            .in("user_id", [...new Set(ids)])
        : Promise.resolve({ data: [] }),
    ]);
    const sumMap = new Map((summaries.data ?? []).map((s) => [s.user_id, s]));
    const kycIds = (rows ?? []).filter((r) => r.kyc_required).map((r) => r.id);
    const { data: subs } = kycIds.length
      ? await context.supabase
          .from("kyc_submissions")
          .select("transaction_id,status,created_at")
          .in("transaction_id", kycIds)
          .order("created_at", { ascending: false })
      : { data: [] };
    const kycMap = new Map<string, string>();
    for (const s of subs ?? [])
      if (s.transaction_id && !kycMap.has(s.transaction_id)) kycMap.set(s.transaction_id, s.status);
    return {
      total: count ?? 0,
      pageSize,
      rows: (rows ?? []).map((t) => {
        const s = sumMap.get(t.user_id);
        return {
          ...t,
          amount: n(t.amount),
          fee: n(t.fee),
          user: users.get(t.user_id) ?? null,
          player: s
            ? {
                balance: n(s.balance),
                deposits: n(s.deposits),
                withdrawn: n(s.withdrawn),
                ggr: n(s.ggr),
                frozen: !!s.is_frozen,
              }
            : null,
          kycStatus: kycMap.get(t.id) ?? null,
        };
      }),
    };
  });

export const setTransactionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["approved", "rejected"]),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!tx) throw new Error("Transação não encontrada");
    if (tx.status !== "pending") throw new Error("Esta transação já foi decidida.");
    if (data.status === "rejected" && !data.reason)
      throw new Error("Informe o motivo. O jogador vê esse texto.");
    if (data.status === "approved" && tx.type === "withdrawal" && tx.kyc_required)
      throw new Error(
        "Esse saque espera documentos. Aprove os documentos em Documentos antes de pagar.",
      );
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "rejected") {
      const base = (tx.description ?? "").split(" — Motivo:")[0];
      patch.description = `${base} — Motivo: ${data.reason}`;
    }
    // Saque: o valor já está reservado; aprovar não mexe no saldo e recusar devolve.
    const { error } = await supabase
      .from("transactions")
      .update(patch as never)
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) {
      const { friendlyDbError } = await import("./money.server");
      throw new Error(friendlyDbError(error.message, error.message));
    }
    await supabase.rpc("admin_log", {
      p_action: `${tx.type}.${data.status}`,
      p_target_user: tx.user_id,
      p_target_id: tx.id,
      p_details: { amount: n(tx.amount), fee: n(tx.fee), reason: data.reason ?? null } as never,
    });
    return { ok: true };
  });

/** Reconsulta um depósito VeoPag pendente direto na API (resolve webhook perdido). */
export const recheckDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: tx } = await context.supabase
      .from("transactions")
      .select("gateway_external_id,status,type")
      .eq("id", data.id)
      .maybeSingle();
    if (!tx || tx.type !== "deposit") throw new Error("Depósito não encontrado");
    if (tx.status !== "pending" || !tx.gateway_external_id) return { status: tx.status };
    const { syncDepositByExternalId } = await import("./veopag.server");
    return { status: await syncDepositByExternalId(tx.gateway_external_id) };
  });

// ---------------------------------------------------------------------------
// Cassino
// ---------------------------------------------------------------------------
export const listRounds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        before: z.string().optional(),
        minBet: z.number().min(0).optional(),
        bigWins: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("game_rounds")
      .select("id,user_id,txn_id,provider,game_code,bet,win,after_balance,status,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.before) q = q.lt("created_at", data.before);
    if (data.minBet) q = q.gte("bet", data.minBet);
    if (data.bigWins) q = q.gte("win", 500);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await usersById(
      context.supabase,
      (rows ?? []).map((r) => r.user_id),
    );
    const named = await withGameNames(context.supabase, rows ?? []);
    return named.map((r) => ({
      ...r,
      bet: n(r.bet),
      win: n(r.win),
      user: users.get(r.user_id) ?? null,
    }));
  });

export const getGameStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(90).default(7) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase.rpc("admin_game_stats", {
      p_days: data.days,
      p_limit: 20,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, bets: n(r.bets), wins: n(r.wins), ggr: n(r.ggr) }));
  });

export const listPfLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ before: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("pf_callback_log")
      .select("id,kind,user_id,txn_id,http_status,result,balance,provider_balance,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await usersById(
      context.supabase,
      (rows ?? []).map((r) => r.user_id ?? ""),
    );
    return (rows ?? []).map((r) => ({
      ...r,
      user: r.user_id ? (users.get(r.user_id) ?? null) : null,
    }));
  });

// ---------------------------------------------------------------------------
// Esportes
// ---------------------------------------------------------------------------
export const listSportsBetsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["open", "settled", "all"]).default("open"),
        before: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("sports_bets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (data.status === "open") q = q.eq("status", "open");
    if (data.status === "settled") q = q.neq("status", "open");
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await usersById(
      context.supabase,
      (rows ?? []).map((r) => r.user_id),
    );
    return (rows ?? []).map((b) => ({
      ...b,
      odd: n(b.odd),
      stake: n(b.stake),
      potential_payout: n(b.potential_payout),
      user: users.get(b.user_id) ?? null,
    }));
  });

export const getSportsExposure = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_sports_exposure");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      ...r,
      stakes: n(r.stakes),
      payout_home: n(r.payout_home),
      payout_draw: n(r.payout_draw),
      payout_away: n(r.payout_away),
    }));
  });

// ---------------------------------------------------------------------------
// Auditoria e reconciliação
// ---------------------------------------------------------------------------
export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ before: z.number().int().optional(), action: z.string().max(60).optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("admin_audit_log")
      .select("*")
      .order("id", { ascending: false })
      .limit(60);
    if (data.before) q = q.lt("id", data.before);
    if (data.action) q = q.like("action", `${data.action}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await usersById(
      context.supabase,
      (rows ?? []).flatMap((r) => [r.admin_id ?? "", r.target_user ?? ""]),
    );
    return (rows ?? []).map((r) => ({
      ...r,
      adminName: r.admin_id ? (users.get(r.admin_id)?.username ?? "admin") : "sistema",
      target: r.target_user ? (users.get(r.target_user) ?? null) : null,
    }));
  });

export const getReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [{ data: issues }, { data: totals }] = await Promise.all([
      context.supabase.from("admin_wallet_reconciliation").select("*").neq("diff", 0).limit(200),
      context.supabase.from("admin_wallet_reconciliation").select("balance,ledger_total"),
    ]);
    const sumBalance = (totals ?? []).reduce((a, r) => a + n(r.balance), 0);
    const sumLedger = (totals ?? []).reduce((a, r) => a + n(r.ledger_total), 0);
    return { issues: issues ?? [], sumBalance, sumLedger, players: totals?.length ?? 0 };
  });

// ---------------------------------------------------------------------------
// Pixel: base de depositantes para públicos semelhantes
// ---------------------------------------------------------------------------
export const listDepositorsPixel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await context.supabase
      .from("admin_player_summary")
      .select("user_id,full_name,cpf,phone,deposits,utm_source,utm_campaign,created_at")
      .gt("deposits", 0)
      .order("deposits", { ascending: false })
      .limit(5000);
    const emails = await emailsFor((rows ?? []).map((r) => r.user_id!));
    return (rows ?? []).map((r) => ({
      ...r,
      email: emails.get(r.user_id!) ?? "",
      deposits: n(r.deposits),
    }));
  });

/** Extrato da casa inteira (todas as contas), mais recente primeiro. */
export const listLedgerAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        before: z.number().int().optional(),
        kind: z.enum(["all", "money", "casino", "sports", "adjustment"]).default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("wallet_ledger")
      .select("*")
      .order("id", { ascending: false })
      .limit(60);
    if (data.before) q = q.lt("id", data.before);
    if (data.kind === "money")
      q = q.in("kind", ["deposit", "withdrawal_hold", "withdrawal_release", "opening"]);
    if (data.kind === "casino") q = q.in("kind", ["casino_bet", "casino_win", "casino_refund"]);
    if (data.kind === "sports")
      q = q.in("kind", ["sports_stake", "sports_payout", "sports_refund"]);
    if (data.kind === "adjustment") q = q.eq("kind", "adjustment");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await usersById(
      context.supabase,
      (rows ?? []).flatMap((r) => [r.user_id, r.created_by ?? ""]),
    );
    return (rows ?? []).map((r) => ({
      ...r,
      amount: n(r.amount),
      balance_after: n(r.balance_after),
      user: users.get(r.user_id) ?? null,
      createdByName: r.created_by ? (users.get(r.created_by)?.username ?? "admin") : null,
    }));
  });
