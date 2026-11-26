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
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const { count: depCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "deposit")
      .eq("status", "approved");
    return { ...data, isAdmin: !!role, hasDeposited: (depCount ?? 0) > 0 };
  });

const updateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Use só letras, números e _")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Celular inválido")
    .optional(),
  full_name: z.string().trim().min(5).max(120).optional(),
});

/** Nome só pode ser preenchido uma vez (depois, só o suporte muda). CPF e nascimento ficam travados no banco. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, string> = {};
    if (data.username) patch.username = data.username.toLowerCase();
    if (data.phone) patch.phone = data.phone;
    if (data.full_name) {
      const { data: me } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      if (me?.full_name?.trim())
        throw new Error("O nome já está cadastrado. Para corrigir, fale com o suporte.");
      patch.full_name = data.full_name.replace(/\s+/g, " ");
    }
    if (!Object.keys(patch).length) return { ok: true };
    if (patch.username) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("username", patch.username)
        .neq("id", userId);
      if ((count ?? 0) > 0) throw new Error("Este nome de usuário já está em uso.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error)
      throw new Error(
        error.message.includes("username")
          ? "Este nome de usuário já está em uso."
          : "Não foi possível salvar.",
      );
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
    // Attach the LATEST KYC submission per transaction (query by transaction_id, not
    // by tx.kyc_submission_id — users can't update transactions via RLS, so the FK
    // may point to a stale, already-rejected submission after a resubmit).
    const txIds = txs.filter((t) => t.type === "withdrawal" && t.kyc_required).map((t) => t.id);
    let subByTx = new Map<string, any>();
    if (txIds.length) {
      const { data: subs } = await supabase
        .from("kyc_submissions")
        .select("id,transaction_id,status,rejection_reason,created_at")
        .in("transaction_id", txIds)
        .order("created_at", { ascending: false });
      for (const s of subs ?? []) {
        if (s.transaction_id && !subByTx.has(s.transaction_id)) subByTx.set(s.transaction_id, s);
      }
    }
    return txs.map((t) => ({ ...t, kyc_submission: subByTx.get(t.id) ?? null }));
  });
