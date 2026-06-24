import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    return { isAdmin: !!data };
  });

export const getDashboardKPIs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    // Compute "today" in São Paulo (UTC-3, no DST) so the dashboard matches Brazilian local time
    const BR_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowBR = new Date(Date.now() - BR_OFFSET_MS);
    // Midnight BR expressed as a UTC instant
    const today = new Date(Date.UTC(nowBR.getUTCFullYear(), nowBR.getUTCMonth(), nowBR.getUTCDate()) + BR_OFFSET_MS);
    const monthStart = new Date(Date.UTC(nowBR.getUTCFullYear(), nowBR.getUTCMonth(), 1) + BR_OFFSET_MS);
    const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [{ data: allTx, error: txError }, { count: userCount, error: usersError }, { data: balances, error: balanceError }, { count: kycPending }, { data: agents, error: agentsError }] = await Promise.all([
      supabase.from("transactions").select("user_id,type,amount,status,created_at,kyc_required"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("balance"),
      supabase.from("kyc_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id,signup_user_agent"),
    ]);
    if (txError) throw new Error(txError.message);
    if (usersError) throw new Error(usersError.message);
    if (balanceError) throw new Error(balanceError.message);
    if (agentsError) throw new Error(agentsError.message);

    const platformOf = (ua: string): "android" | "ios" | "desktop" | "unknown" => {
      const s = (ua ?? "").toLowerCase();
      if (!s) return "unknown";
      if (/iphone|ipad|ipod|ios/.test(s)) return "ios";
      if (/android/.test(s)) return "android";
      if (/windows|macintosh|mac os x|linux|x11/.test(s)) return "desktop";
      return "unknown";
    };
    const userPlatform = new Map<string, "android" | "ios" | "desktop" | "unknown">();
    let android = 0, ios = 0, desktop = 0, unknown = 0;
    for (const row of (agents ?? []) as any[]) {
      const p = platformOf(String(row?.signup_user_agent ?? ""));
      userPlatform.set(row.id, p);
      if (p === "ios") ios++;
      else if (p === "android") android++;
      else if (p === "desktop") desktop++;
      else unknown++;
    }
    const deviceTotal = android + ios + desktop + unknown;
    const pct = (n: number) => deviceTotal ? Math.round((n / deviceTotal) * 100) : 0;
    const depByPlatform: Record<"android" | "ios" | "desktop" | "unknown", number> = { android: 0, ios: 0, desktop: 0, unknown: 0 };
    for (const t of (allTx ?? []) as any[]) {
      if (t.type === "deposit" && t.status === "approved") {
        const p = userPlatform.get(t.user_id) ?? "unknown";
        depByPlatform[p] += Number(t.amount);
      }
    }
    const devices = {
      android, ios, desktop, unknown, total: deviceTotal,
      androidPct: pct(android), iosPct: pct(ios), desktopPct: pct(desktop), unknownPct: pct(unknown),
      androidDeposits: depByPlatform.android,
      iosDeposits: depByPlatform.ios,
      desktopDeposits: depByPlatform.desktop,
      unknownDeposits: depByPlatform.unknown,
    };

    const tx = allTx ?? [];
    const sum = (filter: (t: any) => boolean) => tx.filter(filter).reduce((a, t) => a + Number(t.amount), 0);
    const todayIso = today.toISOString();
    const monthIso = monthStart.toISOString();
    const weekIso = weekStart.toISOString();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const yesterdayIso = new Date(today.getTime() - DAY_MS).toISOString();
    const daily = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart.getTime() + i * DAY_MS);
      const next = new Date(day.getTime() + DAY_MS);
      const start = day.toISOString();
      const end = next.toISOString();
      const labelDate = new Date(day.getTime() - BR_OFFSET_MS);
      const dd = String(labelDate.getUTCDate()).padStart(2, "0");
      const mm = String(labelDate.getUTCMonth() + 1).padStart(2, "0");
      return {
        date: `${dd}/${mm}`,
        deposits: sum(t => t.type === "deposit" && t.status === "approved" && t.created_at >= start && t.created_at < end),
        withdrawals: sum(t => t.type === "withdrawal" && t.status === "approved" && t.created_at >= start && t.created_at < end),
      };
    });

    return {
      depositsToday: sum(t => t.type === "deposit" && t.status === "approved" && t.created_at >= todayIso),
      depositsYesterday: sum(t => t.type === "deposit" && t.status === "approved" && t.created_at >= yesterdayIso && t.created_at < todayIso),
      depositsMonth: sum(t => t.type === "deposit" && t.status === "approved" && t.created_at >= monthIso),
      withdrawalsToday: sum(t => t.type === "withdrawal" && t.status === "approved" && t.created_at >= todayIso),
      withdrawalsMonth: sum(t => t.type === "withdrawal" && t.status === "approved" && t.created_at >= monthIso),
      pendingDeposits: tx.filter(t => t.type === "deposit" && t.status === "pending").length,
      pendingWithdrawals: tx.filter(t => t.type === "withdrawal" && t.status === "pending").length,
      kycPending: kycPending ?? 0,
      kycRequested: tx.filter(t => t.type === "withdrawal" && t.kyc_required).length,
      totalUsers: userCount ?? 0,
      totalBalance: (balances ?? []).reduce((a, p: any) => a + Number(p.balance), 0),
      weeklyNet: sum(t => t.status === "approved" && t.created_at >= weekIso && t.type === "deposit") - sum(t => t.status === "approved" && t.created_at >= weekIso && t.type === "withdrawal"),
      chart: daily,
      devices,
    };
  });

async function fetchEmailMap(ids: string[]): Promise<Map<string, string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const wanted = new Set(ids);
  let page = 1;
  while (wanted.size > 0 && page <= 25) {
    const res = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    const users = res.data?.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      if (wanted.has(u.id)) {
        map.set(u.id, u.email ?? "");
        wanted.delete(u.id);
      }
    }
    if (users.length < 200) break;
    page++;
  }
  return map;
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(5000);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`username.ilike.%${s}%,full_name.ilike.%${s}%,cpf.ilike.%${s}%`);
    }
    const { data: users, error } = await q;
    if (error) throw new Error(error.message);
    const list = users ?? [];
    const emails = await fetchEmailMap(list.map((u: any) => u.id));
    return list.map((u: any) => ({ ...u, email: emails.get(u.id) ?? "" }));
  });

export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [{ data: profile, error: profileError }, { data: txs, error: txError }, { data: kyc, error: kycError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("transactions").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("kyc_submissions").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (profileError) throw new Error(profileError.message);
    if (txError) throw new Error(txError.message);
    if (kycError) throw new Error(kycError.message);
    let email = "";
    if (profile) {
      const emails = await fetchEmailMap([data.id]);
      email = emails.get(data.id) ?? "";
    }
    return { profile: profile ? { ...profile, email } : null, transactions: txs ?? [], kyc: kyc ?? [] };
  });

export const adjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    delta: z.number().refine(v => v !== 0, "Valor não pode ser zero"),
    reason: z.string().min(3).max(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: profile } = await supabase.from("profiles").select("balance").eq("id", data.userId).maybeSingle();
    if (!profile) throw new Error("Usuário não encontrado");
    const next = Number(profile.balance) + data.delta;
    if (next < 0) throw new Error("Saldo ficaria negativo");
    // Insert as already-approved; the DB trigger credits/debits the balance automatically.
    const { error } = await supabase.from("transactions").insert({
      user_id: data.userId,
      type: data.delta > 0 ? "deposit" : "withdrawal",
      amount: Math.abs(data.delta),
      status: "approved",
      description: `Ajuste manual: ${data.reason}`,
    });
    if (error) throw new Error(error.message);
    return { ok: true, balance: next };
  });

const userUpdateSchema = z.object({
  userId: z.string().uuid(),
  full_name: z.string().trim().max(120).optional().nullable(),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional().nullable(),
  cpf: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  kyc_status: z.enum(["pending", "approved", "rejected"]).optional(),
  is_frozen: z.boolean().optional(),
  freeze_reason: z.string().trim().max(500).optional().nullable(),
});

export const updateUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { userId: target, ...patch } = data;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cleaned[k] = v === "" ? null : v;
    }
    if (Object.keys(cleaned).length === 0) return { ok: true };
    cleaned.updated_at = new Date().toISOString();
    const { error } = await supabase.from("profiles").update(cleaned as never).eq("id", target);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const COMPLIANCE_FREEZE_MESSAGE = "TENTATIVA DE EXPLORAÇÃO DE FALHAS, SUA CONTA FOI PERMANENTEMENTE CONGELADA DEVIDO A TENTATIVA DE EXPLORAÇÃO DE FALHAS, O ABUSO DE BONUS, ROLLOVERS, GRUPOS DE COMPARTILHAMENTO DE FALHAS, É TOTALMENTE CONTRA AS REGRAS, APÓS ANALISE DETALHADA, SUA CONTA FOI CONGELADA E SEU SALDO RETORNARA PARA MESMA CONTA DE DEPOSITO EM ATÉ 7 DIAS UTEIS, AGRADECEMOS A COMPREENSÃO! EQUIPE DE COMPLIANCE AGRADECE!";

export const freezeForExploit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Sum approved deposits (excluding bonuses)
    const { data: deposits, error: depErr } = await supabaseAdmin
      .from("transactions")
      .select("amount,description")
      .eq("user_id", data.userId)
      .eq("type", "deposit")
      .eq("status", "approved");
    if (depErr) throw new Error(depErr.message);
    const depositsTotal = (deposits ?? [])
      .filter((t: any) => !(t.description ?? "").toLowerCase().startsWith("bônus") && !(t.description ?? "").toLowerCase().startsWith("ajuste manual"))
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    // 2) Cancel all pending withdrawals (description preserves the reason)
    const { data: pendings } = await supabaseAdmin
      .from("transactions")
      .select("id,description")
      .eq("user_id", data.userId)
      .eq("type", "withdrawal")
      .eq("status", "pending");
    for (const p of (pendings ?? []) as any[]) {
      const base = (p.description ?? "Saque via PIX").split(" — Motivo:")[0];
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: `${base} — Motivo: Conta congelada por compliance — reembolso será processado em até 7 dias úteis` })
        .eq("id", p.id);
    }

    // 3) Freeze + zero balance/bonus (service role bypasses tampering trigger because auth.uid() is null)
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        is_frozen: true,
        freeze_reason: COMPLIANCE_FREEZE_MESSAGE,
        balance: 0,
        bonus_balance: 0,
        bonus_used: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.userId);
    if (profErr) throw new Error(profErr.message);

    // 4) Create a pending refund withdrawal for the deposits total (visible in user history)
    let refundCreated = false;
    if (depositsTotal > 0) {
      const { error: insErr } = await supabaseAdmin.from("transactions").insert({
        user_id: data.userId,
        type: "withdrawal",
        amount: depositsTotal,
        status: "pending",
        description: "SAQUE AGUARDANDO LIBERAÇÃO E ANÁLISE — 7 DIAS ÚTEIS",
      });
      if (insErr) throw new Error(insErr.message);
      refundCreated = true;
    }

    return { ok: true, depositsTotal, cancelledPending: (pendings ?? []).length, refundCreated };
  });

async function purgeUserData(supabaseAdmin: { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } }; auth: { admin: { deleteUser: (id: string) => Promise<{ error: { message: string } | null }> } } }, id: string) {
  // Apaga dados relacionados antes de remover o usuário do auth
  await supabaseAdmin.from("transactions").delete().eq("user_id", id);
  await supabaseAdmin.from("kyc_submissions").delete().eq("user_id", id);
  await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
  await supabaseAdmin.from("profiles").delete().eq("id", id);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
}

export const deleteUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId) throw new Error("Você não pode apagar a própria conta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await purgeUserData(supabaseAdmin as never, data.userId);
    return { ok: true };
  });

export const deleteUsersBulkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userIds: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const targets = data.userIds.filter((id) => id !== userId);
    if (!targets.length) throw new Error("Nenhum usuário válido (você não pode apagar a si mesmo)");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const errors: string[] = [];
    for (const id of targets) {
      try {
        await purgeUserData(supabaseAdmin as never, id);
      } catch (e) {
        errors.push(`${id.slice(0, 8)}: ${(e as Error).message}`);
      }
    }
    if (errors.length) throw new Error(`Erros: ${errors.join("; ")}`);
    return { ok: true, deleted: targets.length };
  });

export const deleteTransactionsBulkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("transactions").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });

export const listTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    type: z.enum(["all", "deposit", "withdrawal", "bet"]).default("all"),
    status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(5000);
    if (data.type !== "all") q = q.eq("type", data.type);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: tx, error } = await q;
    if (error) throw new Error(error.message);
    if (!tx?.length) return [];
    const userIds = [...new Set(tx.map(t => t.user_id))];
    const { data: users } = await supabase.from("profiles").select("id,username,full_name,cpf,phone").in("id", userIds);
    const map = new Map((users ?? []).map((u: any) => [u.id, u]));
    const emails = await fetchEmailMap(userIds);
    return tx.map(t => {
      const u: any = map.get(t.user_id) ?? null;
      const email = emails.get(t.user_id) ?? "";
      return { ...t, user: u ? { ...u, email } : { email } };
    });
  });

export const setTransactionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
    reason: z.string().trim().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: tx } = await supabase.from("transactions").select("*").eq("id", data.id).maybeSingle();
    if (!tx) throw new Error("Transação não encontrada");
    if (tx.status !== "pending") throw new Error("Transação já foi processada");
    // Pre-check withdrawal balance
    if (data.status === "approved" && tx.type === "withdrawal") {
      const { data: prof } = await supabase.from("profiles").select("balance").eq("id", tx.user_id).maybeSingle();
      if (!prof || Number(prof.balance) < Number(tx.amount)) throw new Error("Saldo insuficiente do usuário");
    }
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "rejected" && data.reason) {
      const base = (tx.description ?? "").split(" — Motivo:")[0];
      patch.description = `${base} — Motivo: ${data.reason}`;
    }
    const { error } = await supabase.from("transactions").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Pixel: depositor data for lookalike audiences
export const listDepositorsPixel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    // Use admin client to also read auth.users email
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!profiles?.length) return [];
    const ids = profiles.map((p: any) => p.id);
    const { data: txs } = await supabaseAdmin
      .from("transactions")
      .select("user_id,amount,type,status")
      .in("user_id", ids)
      .eq("type", "deposit")
      .eq("status", "approved");
    const depMap = new Map<string, { total: number; count: number }>();
    for (const t of txs ?? []) {
      const cur = depMap.get(t.user_id) ?? { total: 0, count: 0 };
      cur.total += Number(t.amount);
      cur.count += 1;
      depMap.set(t.user_id, cur);
    }
    // Fetch emails in chunks
    const emailMap = new Map<string, string>();
    for (let i = 0; i < ids.length; i += 200) {
      const page = await supabaseAdmin.auth.admin.listUsers({ page: Math.floor(i / 200) + 1, perPage: 200 });
      for (const u of page.data?.users ?? []) {
        emailMap.set(u.id, u.email ?? "");
      }
    }
    return profiles
      .map((p: any) => {
        const d = depMap.get(p.id) ?? { total: 0, count: 0 };
        return {
          id: p.id,
          email: emailMap.get(p.id) ?? "",
          full_name: p.full_name,
          cpf: p.cpf,
          phone: p.phone,
          total_deposited: d.total,
          deposits_count: d.count,
          utm_source: p.utm_source,
          utm_medium: p.utm_medium,
          utm_campaign: p.utm_campaign,
          fbp: p.fbp,
          fbc: p.fbc,
          referrer: p.referrer,
          signup_ip: p.signup_ip,
          created_at: p.created_at,
        };
      })
      .filter((r: any) => r.deposits_count > 0);
  });
