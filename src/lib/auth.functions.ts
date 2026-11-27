import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { passwordOk, PASSWORD_RULE_TEXT } from "./password-policy";

async function anonClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Autenticação indisponível");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** IP e navegador de quem fez a requisição (cadastro e login, Portaria 1.231 art. 31, X). */
function requestContext() {
  const h = getRequest().headers;
  const ip = (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") ?? "").split(",")[0] ||
    ""
  )
    .trim()
    .slice(0, 64);
  return { ip: ip || null, ua: (h.get("user-agent") ?? "").slice(0, 400) };
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

type SignInResult =
  | { ok: true; access_token: string; refresh_token: string; previousLoginAt: string | null }
  | { ok: false; error: string; locked?: boolean };

const WRONG = "Dados de acesso incorretos. Depois de 3 tentativas erradas a conta é bloqueada.";

/**
 * Login pelo servidor, por e-mail ou CPF (Portaria 1.231, art. 36):
 * - conta encerrada, bloqueada ou em autoexclusão não entra;
 * - 3 senhas erradas bloqueiam até a troca de senha pelo link do e-mail;
 * - grava data, hora e IP do acesso e devolve o acesso anterior para o aviso.
 * O e-mail ligado a um CPF nunca volta para o navegador.
 */
export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        identifier: z.string().trim().min(3).max(200),
        password: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SignInResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = data.identifier.replace(/\D/g, "");
    const isCpf = !data.identifier.includes("@") && digits.length === 11;

    let userId: string | null = null;
    let email: string | null = null;
    if (isCpf) {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("cpf", digits)
        .limit(2);
      // CPF repetido (cadastros antigos) é ambíguo: obriga o login por e-mail.
      if (rows?.length === 1) {
        userId = rows[0].id;
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
        email = u?.user?.email ?? null;
      }
    } else {
      email = data.identifier.toLowerCase();
      const { data: id } = await supabaseAdmin.rpc("auth_user_id_by_email", { p_email: email });
      userId = (id as string | null) ?? null;
    }
    if (!userId || !email) return { ok: false, error: WRONG };

    const [{ data: profile }, { data: rg }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("closed_at,locked_at,balance")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("rg_limits")
        .select("self_excluded_until")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (profile?.closed_at)
      return {
        ok: false,
        error: "Esta conta foi encerrada. Para reabrir, fale com o atendimento.",
      };
    // Em autoexclusão só entra quem ainda tem saldo para sacar (apostas e depósitos seguem bloqueados).
    if (
      rg?.self_excluded_until &&
      new Date(rg.self_excluded_until) > new Date() &&
      Number(profile?.balance ?? 0) <= 0
    )
      return {
        ok: false,
        error: `Sua conta está em autoexclusão até ${fmtDate(rg.self_excluded_until)}.`,
      };
    if (profile?.locked_at)
      return {
        ok: false,
        locked: true,
        error:
          "Conta bloqueada depois de 3 tentativas erradas. Use “Esqueci minha senha” para criar uma senha nova e desbloquear.",
      };

    const { ip } = requestContext();
    const client = await anonClient();
    const { data: session, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error || !session.session) {
      if (error?.message?.toLowerCase().includes("email not confirmed"))
        return { ok: false, error: "Confirme seu e-mail pelo link que enviamos antes de entrar." };
      const { data: rec } = await supabaseAdmin.rpc("auth_record_login", {
        p_user: userId,
        p_success: false,
        p_ip: ip ?? "",
      });
      const r = Array.isArray(rec) ? rec[0] : null;
      if (r?.locked)
        return {
          ok: false,
          locked: true,
          error:
            "Conta bloqueada depois de 3 tentativas erradas. Use “Esqueci minha senha” para criar uma senha nova e desbloquear.",
        };
      return { ok: false, error: WRONG };
    }

    const { data: before } = await supabaseAdmin
      .from("profiles")
      .select("last_login_at")
      .eq("id", userId)
      .maybeSingle();
    await supabaseAdmin.rpc("auth_record_login", {
      p_user: userId,
      p_success: true,
      p_ip: ip ?? "",
    });
    return {
      ok: true,
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      previousLoginAt: before?.last_login_at ?? null,
    };
  });

/** Antes de trocar a senha pelo link do e-mail o titular continua bloqueado; depois, libera. */
export const clearMyLoginLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("auth_clear_lock");
    return { ok: true };
  });

/** Checagem antes do cadastro, para mostrar a mensagem certa em cada campo. */
export const checkSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        cpf: z.string().regex(/^\d{11}$/),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("./money.server");
    const settings = await m.loadMoneySettings();
    const errors: { cpf?: string; birthDate?: string; form?: string } = {};
    if (!settings.signup_enabled) errors.form = "Novos cadastros estão temporariamente fechados.";
    if (!m.isValidCpf(data.cpf)) errors.cpf = "Este CPF não é válido.";
    else {
      const admin = await m.getAdminClient();
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("cpf", data.cpf);
      if ((count ?? 0) > 0)
        errors.cpf = "Já existe uma conta com este CPF. Entre com ela ou recupere a senha.";
    }
    const age = m.ageOn(data.birthDate);
    if (age < 0 || age > 120) errors.birthDate = "Data de nascimento inválida.";
    else if (age < 18) errors.birthDate = "É preciso ter 18 anos ou mais para criar conta.";
    return { ok: Object.keys(errors).length === 0, errors };
  });

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const trackingSchema = z
  .object({
    referrer: z.string().max(500).optional(),
    utm_source: z.string().max(120).optional(),
    utm_medium: z.string().max(120).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    utm_term: z.string().max(200).optional(),
    fbp: z.string().max(200).optional(),
    fbc: z.string().max(300).optional(),
  })
  .partial();

const signUpSchema = z.object({
  fullName: z.string().trim().min(5).max(120),
  cpf: z.string().regex(/^\d{11}$/),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().trim().min(3).max(60),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().regex(/^\d{10,11}$/),
  password: z.string().min(8).max(72),
  address: z.object({
    zip: z.string().regex(/^\d{8}$/),
    street: z.string().trim().min(2).max(160),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional().default(""),
    district: z.string().trim().max(80).optional().default(""),
    city: z.string().trim().min(2).max(80),
    state: z.enum(UFS),
  }),
  acceptTerms: z.literal(true),
  privacyConsent: z.literal(true),
  tracking: trackingSchema.optional(),
});

type SignUpResult =
  | { ok: true; confirmEmail: true }
  | { ok: true; confirmEmail: false; access_token: string; refresh_token: string }
  | { ok: false; field?: "email" | "password" | "cpf" | "form"; error: string };

/**
 * Cadastro pelo servidor (Portaria 1.231, art. 31): grava IP e navegador do
 * cadastro, versão dos termos aceita e o consentimento LGPD. O banco
 * (handle_new_user) valida de novo CPF, idade, endereço e aceite.
 */
export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signUpSchema.parse(d))
  .handler(async ({ data }): Promise<SignUpResult> => {
    if (!passwordOk(data.password))
      return { ok: false, field: "password", error: PASSWORD_RULE_TEXT };
    const m = await import("./money.server");
    const settings = await m.loadMoneySettings(true);
    if (!settings.signup_enabled)
      return { ok: false, field: "form", error: "Novos cadastros estão temporariamente fechados." };
    if (!m.isValidCpf(data.cpf))
      return { ok: false, field: "cpf", error: "Este CPF não é válido." };
    if (m.ageOn(data.birthDate) < 18)
      return { ok: false, field: "form", error: "É preciso ter 18 anos ou mais para criar conta." };

    const { ip, ua } = requestContext();
    const origin = (() => {
      const h = getRequest().headers;
      const o = h.get("origin") ?? "";
      return /^https?:\/\/[\w.-]+(:\d+)?$/.test(o) ? o : undefined;
    })();
    const t = data.tracking ?? {};
    const client = await anonClient();
    const { data: res, error } = await client.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: origin,
        data: {
          full_name: data.fullName.replace(/\s+/g, " "),
          cpf: data.cpf,
          birth_date: data.birthDate,
          phone: data.phone,
          nationality: data.nationality,
          address_zip: data.address.zip,
          address_street: data.address.street,
          address_number: data.address.number,
          address_complement: data.address.complement,
          address_district: data.address.district,
          address_city: data.address.city,
          address_state: data.address.state,
          country: "BR",
          terms_version: settings.terms_version || "1",
          privacy_consent: true,
          signup_ip: ip ?? "",
          signup_user_agent: ua,
          ...t,
        },
      },
    });
    if (error) {
      const msg = signupErrorMessage(error.message);
      return {
        ok: false,
        field: msg.includes("e-mail") ? "email" : msg.includes("senha") ? "password" : "form",
        error: msg,
      };
    }
    if (!res.session) return { ok: true, confirmEmail: true };
    // Primeira entrada já conta como acesso (data, hora e IP).
    if (res.user) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("auth_record_login", {
        p_user: res.user.id,
        p_success: true,
        p_ip: ip ?? "",
      });
    }
    return {
      ok: true,
      confirmEmail: false,
      access_token: res.session.access_token,
      refresh_token: res.session.refresh_token,
    };
  });

/** Traduz o erro do Supabase no cadastro (o trigger do banco é a última barreira). */
export function signupErrorMessage(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("already") || m.includes("registered"))
    return "Este e-mail já tem conta. Entre ou recupere a senha.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("password"))
    return "Escolha uma senha mais forte, com letras, números e um caractere especial.";
  if (m.includes("rate") || m.includes("limit"))
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (m.includes("invalid") && m.includes("email")) return "Confira o e-mail digitado.";
  if (m.includes("database error"))
    return "Não foi possível concluir o cadastro. Confira CPF, data de nascimento e endereço.";
  return "Não foi possível criar a conta agora. Tente de novo em instantes.";
}
