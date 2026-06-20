import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const { count: depCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "deposit")
      .eq("status", "approved");
    return { ...data, isAdmin: !!role, hasDeposited: (depCount ?? 0) > 0 };
  });

const updateSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
  phone: z.string().trim().max(20).optional(),
  cpf: z.string().trim().max(20).optional(),
  avatar_url: z.string().url().max(500).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const txSchema = z.object({
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.number().min(1).max(100000),
  pix_key: z.string().trim().min(1).max(200).optional(),
});

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => txSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Load settings
    const { data: settings } = await supabase.from("app_settings").select("key,value");
    const s = Object.fromEntries((settings ?? []).map(r => [r.key, r.value as never])) as Record<string, number | boolean>;
    if (s.maintenance_mode) throw new Error("Plataforma em manutenção");
    // Block frozen accounts
    const { data: me } = await supabase.from("profiles").select("is_frozen,freeze_reason").eq("id", userId).maybeSingle();
    if (me?.is_frozen) throw new Error(me.freeze_reason ? `Conta congelada — Motivo: ${me.freeze_reason}` : "Conta congelada. Entre em contato com o suporte.");
    if (data.type === "deposit") {
      const min = Number(s.min_deposit ?? 30), max = Number(s.max_deposit ?? 3000);
      if (data.amount < min) throw new Error(`Depósito mínimo: R$ ${min.toFixed(2)}`);
      if (data.amount > max) throw new Error(`Depósito máximo: R$ ${max.toFixed(2)}`);
    } else {
      const min = Number(s.min_withdraw ?? 50), max = Number(s.max_withdraw ?? 5000);
      if (data.amount < min) throw new Error(`Saque mínimo: R$ ${min.toFixed(2)}`);
      if (data.amount > max) throw new Error(`Saque máximo: R$ ${max.toFixed(2)}`);
      const { data: prof } = await supabase.from("profiles").select("balance").eq("id", userId).maybeSingle();
      if (!prof) throw new Error("Perfil não encontrado");
      // Reserve balance against other pending withdrawals to block spam-requests
      const { data: pendings } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "withdrawal")
        .eq("status", "pending");
      const reserved = (pendings ?? []).reduce((sum, t: any) => sum + Number(t.amount), 0);
      const available = Number(prof.balance) - reserved;
      if (available < data.amount) {
        throw new Error(
          reserved > 0
            ? `Você já tem R$ ${reserved.toFixed(2)} em saques pendentes. Saldo disponível: R$ ${Math.max(0, available).toFixed(2)}.`
            : "Saldo insuficiente"
        );
      }
      if (!data.pix_key) throw new Error("Chave PIX obrigatória");
    }
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      type: data.type,
      amount: data.amount,
      pix_key: data.pix_key,
      status: "pending",
      description: data.type === "deposit" ? "Depósito via PIX" : "Saque via PIX",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const txs = data ?? [];
    // Attach latest KYC submission per transaction
    const subIds = txs.map(t => t.kyc_submission_id).filter(Boolean) as string[];
    let subMap = new Map<string, any>();
    if (subIds.length) {
      const { data: subs } = await supabase.from("kyc_submissions").select("id,status,rejection_reason").in("id", subIds);
      subMap = new Map((subs ?? []).map((s: any) => [s.id, s]));
    }
    return txs.map(t => ({ ...t, kyc_submission: t.kyc_submission_id ? subMap.get(t.kyc_submission_id) ?? null : null }));
  });


// Self-promote to admin (only works if no admin exists yet — bootstrap)
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Já existe um administrador. Peça a ele para promover você.");
    const { error } = await supabase.from("user_roles").update({ role: "admin" }).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
