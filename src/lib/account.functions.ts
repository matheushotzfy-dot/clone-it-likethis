import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function money() {
  return import("./money.server");
}
async function fail(message: string | undefined, fallback: string): Promise<never> {
  const { friendlyDbError } = await money();
  throw new Error(friendlyDbError(message, fallback));
}

/**
 * Painel permanente (Portaria 1.231, art. 4º, X): tempo de sessão, resultado e
 * depósitos do dia, apostas feitas hoje, último acesso, pausa e limites.
 */
export const getMyRgStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows }, { data: limits }] = await Promise.all([
      context.supabase.rpc("my_rg_status"),
      context.supabase.from("rg_limits").select("*").eq("user_id", context.userId).maybeSingle(),
    ]);
    const r = Array.isArray(rows) ? rows[0] : null;
    return {
      sessionStartedAt: r?.session_started_at ?? null,
      todayResult: Number(r?.today_result ?? 0),
      todayDeposits: Number(r?.today_deposits ?? 0),
      todayBets: Number(r?.today_bets ?? 0),
      lastLoginAt: r?.last_login_at ?? null,
      previousLoginAt: r?.previous_login_at ?? null,
      alertMinutes: limits?.session_alert_minutes ?? 60,
      sessionLimit: limits?.session_minutes ?? null,
      pausedUntil:
        limits?.paused_until && new Date(limits.paused_until) > new Date()
          ? limits.paused_until
          : null,
      selfExcludedUntil:
        limits?.self_excluded_until && new Date(limits.self_excluded_until) > new Date()
          ? limits.self_excluded_until
          : null,
    };
  });

/** Mantém a sessão viva no banco (base do limite e do painel de tempo). */
export const touchSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("touch_last_seen");
    return { ok: true };
  });

export const acceptTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ version: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("accept_terms", { p_version: data.version });
    if (error) await fail(error.message, "Não foi possível registrar o aceite.");
    return { ok: true };
  });

export const markLimitsPrompted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("mark_limits_prompted");
    return { ok: true };
  });

/** Encerrar a conta (art. 23, VII). Precisa estar sem saldo e sem pagamento em aberto. */
export const closeMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reason: z.string().trim().max(300).default("") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("close_my_account", { p_reason: data.reason });
    if (error) await fail(error.message, "Não foi possível encerrar a conta.");
    return { ok: true };
  });

/** Pausa (art. 4º, IV, c): acessa e saca, mas não aposta nem deposita. */
export const pauseMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        days: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: until, error } = await context.supabase.rpc("rg_pause", { p_days: data.days });
    if (error) await fail(error.message, "Não foi possível iniciar a pausa.");
    return { until: until as string };
  });

/** Fim antecipado da pausa só vale depois de 24 h (art. 4º, §2º). */
export const endMyPause = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: until, error } = await context.supabase.rpc("rg_end_pause");
    if (error) await fail(error.message, "Não foi possível encerrar a pausa.");
    return { until: (until as string | null) ?? null };
  });

/** Informe de rendimentos do ano para o Imposto de Renda (art. 41). */
export const getAnnualStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ year: z.number().int().min(2024).max(2100) }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: rows, error }, { data: me }] = await Promise.all([
      context.supabase.rpc("my_annual_statement", { p_year: data.year }),
      context.supabase
        .from("profiles")
        .select("full_name,cpf")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    if (error) await fail(error.message, "Não foi possível gerar o informe.");
    const r = Array.isArray(rows) ? rows[0] : null;
    const { loadMoneySettings } = await money();
    const s = await loadMoneySettings();
    return {
      year: data.year,
      holder: { name: me?.full_name ?? "", cpf: me?.cpf ?? "" },
      company: { name: s.company_name, cnpj: s.company_cnpj },
      deposits: Number(r?.deposits ?? 0),
      withdrawals: Number(r?.withdrawals ?? 0),
      bets: Number(r?.bets ?? 0),
      prizes: Number(r?.prizes ?? 0),
      refunds: Number(r?.refunds ?? 0),
      net: Number(r?.net ?? 0),
    };
  });

const identitySchema = z.object({
  document_type: z.enum(["rg", "cnh", "cin", "passaporte"]),
  id_front_path: z.string().min(1).max(500),
  id_back_path: z.string().min(1).max(500).optional().nullable(),
  selfie_path: z.string().min(1).max(500),
});

/**
 * Verificação de identidade do cadastro (art. 31, XI e §3º): documento com foto
 * e selfie segurando o documento. Fica em análise até o admin aprovar; sem ela
 * a conta não deposita nem aposta (art. 31, §6º).
 * Ponto de troca: um provedor de biometria com prova de vida entra aqui.
 */
export const submitIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => identitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const needsBack = data.document_type === "rg" || data.document_type === "cin";
    if (needsBack && !data.id_back_path) throw new Error("Envie também o verso do documento.");
    const prefix = `${userId}/identity/`;
    const paths = [data.id_front_path, data.id_back_path, data.selfie_path].filter(
      Boolean,
    ) as string[];
    if (paths.some((p) => !p.startsWith(prefix) || p.includes("..")))
      throw new Error("Arquivo inválido. Envie as fotos de novo.");

    const { getAdminClient } = await money();
    const admin = await getAdminClient();
    const { data: me } = await admin
      .from("profiles")
      .select("kyc_status")
      .eq("id", userId)
      .maybeSingle();
    if (me?.kyc_status === "verified") return { ok: true, status: "verified" as const };
    if (me?.kyc_status === "pending") throw new Error("Seus documentos já estão em análise.");

    const { error } = await admin.from("kyc_submissions").insert({
      user_id: userId,
      transaction_id: null,
      document_type: data.document_type,
      id_front_url: data.id_front_path,
      id_back_url: data.id_back_path ?? null,
      residence_url: null,
      selfie_url: data.selfie_path,
      status: "pending",
    });
    if (error) throw new Error("Não foi possível enviar os documentos. Tente de novo.");
    await admin
      .from("profiles")
      .update({ kyc_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", userId);
    return { ok: true, status: "pending" as const };
  });

/** Situação da verificação de identidade e o motivo, se foi recusada. */
export const getMyIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: me }, { data: last }] = await Promise.all([
      context.supabase.from("profiles").select("kyc_status").eq("id", context.userId).maybeSingle(),
      context.supabase
        .from("kyc_submissions")
        .select("status,rejection_reason,created_at,reviewed_at")
        .eq("user_id", context.userId)
        .is("transaction_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      status: (me?.kyc_status ?? "none") as "none" | "pending" | "verified" | "rejected",
      rejectionReason: last?.status === "rejected" ? (last.rejection_reason ?? null) : null,
      submittedAt: last?.created_at ?? null,
    };
  });
