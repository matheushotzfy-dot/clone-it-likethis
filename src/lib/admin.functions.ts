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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [{ data: allTx }, { count: userCount }, { data: balances }] = await Promise.all([
      supabase.from("transactions").select("type,amount,status,created_at"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("balance"),
    ]);

    const tx = allTx ?? [];
    const sum = (filter: (t: any) => boolean) => tx.filter(filter).reduce((a, t) => a + Number(t.amount), 0);
    const todayIso = today.toISOString();
    const monthIso = monthStart.toISOString();

    return {
      depositsToday: sum(t => t.type === "deposit" && t.status === "approved" && t.created_at >= todayIso),
      depositsMonth: sum(t => t.type === "deposit" && t.status === "approved" && t.created_at >= monthIso),
      withdrawalsToday: sum(t => t.type === "withdrawal" && t.status === "approved" && t.created_at >= todayIso),
      withdrawalsMonth: sum(t => t.type === "withdrawal" && t.status === "approved" && t.created_at >= monthIso),
      pendingDeposits: tx.filter(t => t.type === "deposit" && t.status === "pending").length,
      pendingWithdrawals: tx.filter(t => t.type === "withdrawal" && t.status === "pending").length,
      totalUsers: userCount ?? 0,
      totalBalance: (balances ?? []).reduce((a, p: any) => a + Number(p.balance), 0),
    };
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`username.ilike.%${s}%,full_name.ilike.%${s}%,cpf.ilike.%${s}%`);
    }
    const { data: users, error } = await q;
    if (error) throw new Error(error.message);
    return users ?? [];
  });

export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [{ data: profile }, { data: txs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("transactions").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(100),
    ]);
    return { profile, transactions: txs ?? [] };
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
    const { error } = await supabase.from("profiles").update({ balance: next, updated_at: new Date().toISOString() }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabase.from("transactions").insert({
      user_id: data.userId,
      type: data.delta > 0 ? "deposit" : "withdrawal",
      amount: Math.abs(data.delta),
      status: "approved",
      description: `Ajuste manual: ${data.reason}`,
    });
    return { ok: true, balance: next };
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
    let q = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(300);
    if (data.type !== "all") q = q.eq("type", data.type);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: tx } = await q;
    if (!tx?.length) return [];
    const userIds = [...new Set(tx.map(t => t.user_id))];
    const { data: users } = await supabase.from("profiles").select("id,username,full_name").in("id", userIds);
    const map = new Map((users ?? []).map(u => [u.id, u]));
    return tx.map(t => ({ ...t, user: map.get(t.user_id) ?? null }));
  });

export const setTransactionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
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
    const { error } = await supabase.from("transactions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
