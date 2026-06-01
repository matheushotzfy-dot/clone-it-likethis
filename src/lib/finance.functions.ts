import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

export const listAdSpend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase.from("ad_spend").select("*").order("spend_date", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAdSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    spend_date: z.string().min(8),
    amount: z.number().min(0),
    platform: z.string().trim().min(1).max(40),
    campaign: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("ad_spend").insert({ ...data, created_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("ad_spend").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listGatewayRecon = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase.from("gateway_reconciliation").select("*").order("ref_date", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createGatewayRecon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    ref_date: z.string().min(8),
    real_amount: z.number().min(0),
    fees: z.number().min(0).default(0),
    notes: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("gateway_reconciliation").insert({ ...data, created_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGatewayRecon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("gateway_reconciliation").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [{ data: tx }, { data: ads }, { data: recon }] = await Promise.all([
      supabase.from("transactions").select("type,amount,status,created_at").eq("status", "approved"),
      supabase.from("ad_spend").select("amount"),
      supabase.from("gateway_reconciliation").select("real_amount,fees"),
    ]);
    const sum = (arr: any[], k: string) => (arr ?? []).reduce((a, t) => a + Number(t[k] ?? 0), 0);
    const deposits = (tx ?? []).filter(t => t.type === "deposit").reduce((a, t) => a + Number(t.amount), 0);
    const withdrawals = (tx ?? []).filter(t => t.type === "withdrawal").reduce((a, t) => a + Number(t.amount), 0);
    const adSpend = sum(ads ?? [], "amount");
    const gatewayReal = sum(recon ?? [], "real_amount");
    const gatewayFees = sum(recon ?? [], "fees");
    const grossProfit = deposits - withdrawals;
    const realGross = gatewayReal > 0 ? (gatewayReal - withdrawals) : grossProfit;
    const netProfit = realGross - adSpend - gatewayFees;
    return {
      deposits, withdrawals, adSpend, gatewayReal, gatewayFees,
      grossProfit, realGross, netProfit,
      roi: adSpend > 0 ? (netProfit / adSpend) * 100 : 0,
    };
  });
