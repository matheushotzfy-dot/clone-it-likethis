import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const range = z
  .object({ from: isoDate, to: isoDate })
  .refine((r) => r.from <= r.to, { message: "A data inicial vem depois da final." });
const n = (v: unknown) => Number(v ?? 0);

/** Números do período. Datas no fuso de São Paulo, com o último dia incluído. */
export const getFinanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => range.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase.rpc("admin_finance_summary", {
      p_from: data.from,
      p_to: data.to,
    });
    if (error) throw new Error(error.message);
    const r = rows?.[0];
    const deposits = n(r?.deposits),
      withdrawals = n(r?.withdrawals),
      fees = n(r?.withdrawal_fees);
    const casinoGgr = n(r?.casino_bets) - n(r?.casino_wins);
    const sportsGgr = n(r?.sports_stakes) - n(r?.sports_returns);
    const adSpend = n(r?.ad_spend),
      gatewayFees = n(r?.gateway_fees),
      gatewayReal = n(r?.gateway_real);
    // Pix que saiu de fato = valor do saque menos a taxa retida.
    const paidOut = withdrawals - fees;
    const cash = deposits - paidOut;
    const net = cash - adSpend - gatewayFees;
    return {
      deposits,
      depositsCount: n(r?.deposits_count),
      depositors: n(r?.depositors),
      withdrawals,
      withdrawalsCount: n(r?.withdrawals_count),
      withdrawalFees: fees,
      paidOut,
      casinoBets: n(r?.casino_bets),
      casinoWins: n(r?.casino_wins),
      casinoGgr,
      sportsStakes: n(r?.sports_stakes),
      sportsReturns: n(r?.sports_returns),
      sportsGgr,
      ggr: casinoGgr + sportsGgr,
      adjustments: n(r?.adjustments),
      adSpend,
      gatewayReal,
      gatewayFees,
      cash,
      net,
      roi: adSpend > 0 ? (net / adSpend) * 100 : null,
      cpa: adSpend > 0 && n(r?.depositors) > 0 ? adSpend / n(r?.depositors) : null,
      liability: n(r?.liability),
      pendingWithdrawals: n(r?.pending_withdrawals),
      gatewayDiff: gatewayReal > 0 ? gatewayReal - deposits : null,
    };
  });

export const listAdSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => range.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("ad_spend")
      .select("*")
      .gte("spend_date", data.from)
      .lte("spend_date", data.to)
      .order("spend_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, amount: n(r.amount) }));
  });

export const createAdSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        spend_date: isoDate,
        amount: z.number().positive().max(10_000_000),
        platform: z.enum(["meta", "google", "tiktok", "kwai", "influencer", "outro"]),
        campaign: z.string().trim().max(120).optional().nullable(),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ad_spend").insert({
      ...data,
      amount: Math.round(data.amount * 100) / 100,
      campaign: data.campaign || null,
      notes: data.notes || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ad_spend").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listGatewayRecon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => range.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("gateway_reconciliation")
      .select("*")
      .gte("ref_date", data.from)
      .lte("ref_date", data.to)
      .order("ref_date", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, real_amount: n(r.real_amount), fees: n(r.fees) }));
  });

export const createGatewayRecon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ref_date: isoDate,
        real_amount: z.number().min(0).max(100_000_000),
        fees: z.number().min(0).max(10_000_000).default(0),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("gateway_reconciliation")
      .insert({ ...data, notes: data.notes || null, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGatewayRecon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("gateway_reconciliation")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
