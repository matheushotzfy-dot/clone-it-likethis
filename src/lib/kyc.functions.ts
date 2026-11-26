import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard";

async function signKycPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

/** Admin pede documentos antes de pagar um saque pendente. */
export const requestKycForTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transactionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: tx } = await supabase
      .from("transactions")
      .select("id,type,status,user_id,amount,kyc_required")
      .eq("id", data.transactionId)
      .maybeSingle();
    if (!tx) throw new Error("Saque não encontrado.");
    if (tx.type !== "withdrawal") throw new Error("Documentos só podem ser pedidos em saques.");
    if (tx.status !== "pending") throw new Error("Esse saque já foi finalizado.");
    if (tx.kyc_required) return { ok: true };
    const { error } = await supabase
      .from("transactions")
      .update({ kyc_required: true })
      .eq("id", data.transactionId);
    if (error) throw new Error(error.message);
    await supabase.rpc("admin_log", {
      p_action: "kyc.request",
      p_target_user: tx.user_id,
      p_target_id: tx.id,
      p_details: { amount: Number(tx.amount) } as never,
    });
    return { ok: true };
  });

const submitSchema = z.object({
  transactionId: z.string().uuid(),
  document_type: z.enum(["rg", "cnh"]),
  id_front_path: z.string().min(1).max(500),
  id_back_path: z.string().min(1).max(500).optional().nullable(),
  residence_path: z.string().min(1).max(500),
  selfie_path: z.string().min(1).max(500),
});

/** Jogador envia os documentos pedidos para um saque. */
export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.document_type === "rg" && !data.id_back_path)
      throw new Error("Envie também o verso do RG.");
    const prefix = `${userId}/${data.transactionId}/`;
    const paths = [
      data.id_front_path,
      data.id_back_path,
      data.residence_path,
      data.selfie_path,
    ].filter(Boolean) as string[];
    if (paths.some((p) => !p.startsWith(prefix) || p.includes("..")))
      throw new Error("Arquivo inválido. Envie as fotos de novo.");

    const { data: tx } = await supabase
      .from("transactions")
      .select("id,status,kyc_required")
      .eq("id", data.transactionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!tx) throw new Error("Saque não encontrado.");
    if (!tx.kyc_required) throw new Error("Esse saque não precisa de documentos.");
    if (tx.status !== "pending") throw new Error("Esse saque já foi finalizado.");
    const { data: open } = await supabase
      .from("kyc_submissions")
      .select("id")
      .eq("transaction_id", data.transactionId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (open) throw new Error("Seus documentos já estão em análise.");

    const { data: sub, error } = await supabase
      .from("kyc_submissions")
      .insert({
        user_id: userId,
        transaction_id: data.transactionId,
        document_type: data.document_type,
        id_front_url: data.id_front_path,
        id_back_url: data.id_back_path ?? null,
        residence_url: data.residence_path,
        selfie_url: data.selfie_path,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("transactions")
      .update({ kyc_submission_id: sub.id })
      .eq("id", data.transactionId);
    return { ok: true, submissionId: sub.id };
  });

/** Situação dos documentos do jogador para um saque. */
export const getMyKycForTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transactionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("kyc_submissions")
      .select("id,status,rejection_reason,created_at,reviewed_at,document_type")
      .eq("user_id", context.userId)
      .eq("transaction_id", data.transactionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { submission: sub ?? null };
  });

/** Admin: envios de documentos com links temporários (30 min) para ver as fotos. */
export const listPendingKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("kyc_submissions")
      .select("*")
      .order("created_at", { ascending: data.status === "pending" })
      .limit(60);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: subs, error } = await q;
    if (error) throw new Error(error.message);
    const list = subs ?? [];
    const userIds = [...new Set(list.map((s) => s.user_id))];
    const txIds = list.map((s) => s.transaction_id).filter(Boolean) as string[];
    const [{ data: profiles }, { data: txs }] = await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("id,full_name,username,cpf,birth_date,created_at,kyc_verified")
            .in("id", userIds)
        : Promise.resolve({ data: [] as never[] }),
      txIds.length
        ? supabase.from("transactions").select("id,amount,status,created_at").in("id", txIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const txMap = new Map((txs ?? []).map((t) => [t.id, { ...t, amount: Number(t.amount) }]));
    return Promise.all(
      list.map(async (s) => ({
        ...s,
        id_front_signed: await signKycPath(s.id_front_url),
        id_back_signed: await signKycPath(s.id_back_url),
        residence_signed: await signKycPath(s.residence_url),
        selfie_signed: await signKycPath(s.selfie_url),
        profile: profMap.get(s.user_id) ?? null,
        withdrawal: s.transaction_id ? (txMap.get(s.transaction_id) ?? null) : null,
      })),
    );
  });

/** Admin aprova ou recusa os documentos. Aprovar não paga o saque: ele volta para a fila de saques. */
export const reviewKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        submissionId: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().trim().max(500).optional(),
      })
      .refine((v) => v.approve || (v.reason && v.reason.length >= 3), {
        message: "Escreva o motivo da recusa para o jogador.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: sub } = await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) throw new Error("Envio não encontrado.");
    if (sub.status !== "pending") throw new Error("Esse envio já foi revisado.");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("kyc_submissions")
      .update({
        status: data.approve ? "approved" : "rejected",
        rejection_reason: data.approve ? null : data.reason!,
        reviewed_at: now,
        reviewed_by: userId,
      })
      .eq("id", data.submissionId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    if (data.approve) {
      await supabase
        .from("profiles")
        .update({ kyc_verified: true, kyc_status: "verified", updated_at: now })
        .eq("id", sub.user_id);
      if (sub.transaction_id)
        await supabase
          .from("transactions")
          .update({ kyc_required: false })
          .eq("id", sub.transaction_id);
    }
    await supabase.rpc("admin_log", {
      p_action: "kyc.review",
      p_target_user: sub.user_id,
      p_target_id: sub.id,
      p_details: { aprovado: data.approve, motivo: data.approve ? null : data.reason } as never,
    });
    return { ok: true };
  });
