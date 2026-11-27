import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { MoneySettings } from "./money.server";
import { assertAdmin } from "./admin-guard";

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
    testPayments: s.active_gateway === "teste" && !s.real_money_enabled,
    requireIdentity: s.require_identity,
    termsVersion: s.terms_version,
    support: {
      email: s.support_email,
      whatsapp: s.support_whatsapp,
      hours: s.support_hours,
      ouvidoria: s.ouvidoria_email,
    },
    spaAuthorization: s.spa_authorization,
    company: { name: s.company_name, cnpj: s.company_cnpj },
  };
});

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppSettings> => {
    await assertAdmin(context.supabase, context.userId);
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
    active_gateway: z.enum(["podpay", "bspay", "veopag", "teste"]).optional(),
    min_deposit: money.optional(),
    max_deposit: money.optional(),
    min_withdraw: money.optional(),
    max_withdraw: money.optional(),
    withdrawal_fee_pct: z.number().min(0).max(100).optional(),
    min_bet_sports: money.optional(),
    max_bet_sports: money.optional(),
    max_payout_sports: money.optional(),
    require_identity: z.boolean().optional(),
    terms_version: z
      .string()
      .trim()
      .regex(/^[\w.-]{1,20}$/, "Use só letras, números, ponto e traço na versão")
      .optional(),
    support_email: z.union([z.literal(""), z.string().trim().email().max(120)]).optional(),
    support_whatsapp: z
      .string()
      .trim()
      .regex(/^\d{0,13}$/, "WhatsApp só com números, com DDD")
      .optional(),
    support_hours: z.string().trim().max(120).optional(),
    ouvidoria_email: z.union([z.literal(""), z.string().trim().email().max(120)]).optional(),
    spa_authorization: z.string().trim().max(120).optional(),
    company_name: z.string().trim().max(160).optional(),
    company_cnpj: z
      .string()
      .trim()
      .regex(/^(\d{14})?$/, "CNPJ com 14 números")
      .optional(),
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
    await assertAdmin(supabase, userId);
    const { loadMoneySettings } = await import("./money.server");
    const cur = await loadMoneySettings(true);
    const realMoney = data.real_money_enabled ?? cur.real_money_enabled;
    const gateway = data.active_gateway ?? cur.active_gateway;
    // Pix simulado e dinheiro real nunca convivem.
    if (realMoney && gateway === "teste")
      throw new Error(
        "Troque o gateway de teste por um gateway real antes de ligar o dinheiro real.",
      );
    if (realMoney && !(data.require_identity ?? cur.require_identity))
      throw new Error("Com dinheiro real, a verificação de identidade é obrigatória.");
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
