import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { MoneySettings } from "./money.server";

export type AppSettings = MoneySettings;

/** O que qualquer visitante pode saber (sem login): status da plataforma e limites. */
export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { loadMoneySettings } = await import("./money.server");
  const s = await loadMoneySettings();
  return {
    realMoney: s.real_money_enabled,
    maintenance: s.maintenance_mode,
    casino: s.casino_enabled,
    sports: s.sports_enabled,
    signup: s.signup_enabled,
    minDeposit: s.min_deposit,
    maxDeposit: s.max_deposit,
    minWithdraw: s.min_withdraw,
    maxWithdraw: s.max_withdraw,
    minBetSports: s.min_bet_sports,
    maxBetSports: s.max_bet_sports,
    maxPayoutSports: s.max_payout_sports,
    activeGateway: s.active_gateway,
  };
});

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<AppSettings> => {
    const { loadMoneySettings } = await import("./money.server");
    return loadMoneySettings(true);
  });

const money = z.number().min(0).max(10_000_000);
const updateSchema = z
  .object({
    real_money_enabled: z.boolean().optional(),
    maintenance_mode: z.boolean().optional(),
    casino_enabled: z.boolean().optional(),
    sports_enabled: z.boolean().optional(),
    signup_enabled: z.boolean().optional(),
    active_gateway: z.enum(["podpay", "bspay", "veopag"]).optional(),
    min_deposit: money.optional(),
    max_deposit: money.optional(),
    min_withdraw: money.optional(),
    max_withdraw: money.optional(),
    withdrawal_fee_pct: z.number().min(0).max(100).optional(),
    min_bet_sports: money.optional(),
    max_bet_sports: money.optional(),
    max_payout_sports: money.optional(),
  })
  .refine(
    (d) =>
      d.min_deposit === undefined || d.max_deposit === undefined || d.min_deposit <= d.max_deposit,
    "Depósito mínimo maior que o máximo",
  )
  .refine(
    (d) =>
      d.min_withdraw === undefined ||
      d.max_withdraw === undefined ||
      d.min_withdraw <= d.max_withdraw,
    "Saque mínimo maior que o máximo",
  );

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso negado");
    const rows = Object.entries(data).map(([key, value]) => ({
      key,
      value: value as never,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return { ok: true };
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) throw new Error(error.message);
    await supabase.rpc("admin_log", { p_action: "settings.update", p_details: data as never });
    return { ok: true };
  });
