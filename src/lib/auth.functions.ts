import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Resolve a CPF (11 digits, no mask) to the user's email so the client can
 * sign in via supabase.auth.signInWithPassword. Returns null if no profile
 * with that CPF exists (we intentionally return a generic error message on
 * the client to avoid CPF enumeration).
 */
export const resolveEmailFromCpf = createServerFn({ method: "POST" })
  .inputValidator((input: { cpf: string }) =>
    z.object({ cpf: z.string().regex(/^\d{11}$/) }).parse(input)
  )
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", data.cpf)
      .maybeSingle();

    if (!profile) return { email: null as string | null };

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    return { email: userRes?.user?.email ?? null };
  });
