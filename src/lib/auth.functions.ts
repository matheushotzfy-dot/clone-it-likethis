import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function anonClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Autenticação indisponível");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Login com CPF feito no servidor: o e-mail ligado ao CPF nunca sai daqui
 * (antes ele era devolvido ao navegador, o que expunha o e-mail de qualquer CPF).
 * Devolve os tokens da sessão para o cliente chamar supabase.auth.setSession.
 */
export const signInWithCpf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ cpf: z.string().regex(/^\d{11}$/), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const fail = { ok: false as const, error: "CPF ou senha incorretos." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", data.cpf)
      .limit(2);
    // CPF repetido (cadastros antigos) é ambíguo: obriga o login por e-mail.
    if (!rows || rows.length !== 1) return fail;
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(rows[0].id);
    const email = userRes?.user?.email;
    if (!email) return fail;
    const client = await anonClient();
    const { data: session, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !session.session) {
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        return {
          ok: false as const,
          error: "Confirme seu e-mail pelo link que enviamos antes de entrar.",
        };
      }
      return fail;
    }
    return {
      ok: true as const,
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    };
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

/** Traduz o erro do Supabase no cadastro (o trigger do banco é a última barreira). */
export function signupErrorMessage(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("already") || m.includes("registered"))
    return "Este e-mail já tem conta. Entre ou recupere a senha.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("password"))
    return "Escolha uma senha mais forte, com letras e números.";
  if (m.includes("rate") || m.includes("limit"))
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (m.includes("invalid") && m.includes("email")) return "Confira o e-mail digitado.";
  if (m.includes("database error"))
    return "Não foi possível concluir o cadastro. Confira CPF e data de nascimento.";
  return "Não foi possível criar a conta agora. Tente de novo em instantes.";
}
