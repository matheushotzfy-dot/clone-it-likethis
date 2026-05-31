import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

async function signKycPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

// Admin requests KYC verification on a pending withdrawal
export const requestKycForTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transactionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: tx } = await supabase.from("transactions").select("*").eq("id", data.transactionId).maybeSingle();
    if (!tx) throw new Error("Transação não encontrada");
    if (tx.type !== "withdrawal") throw new Error("Apenas saques");
    if (tx.status !== "pending") throw new Error("Transação não está pendente");
    const { error } = await supabase.from("transactions").update({ kyc_required: true }).eq("id", data.transactionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// User submits KYC documents
const submitSchema = z.object({
  transactionId: z.string().uuid(),
  document_type: z.enum(["rg", "cnh"]),
  id_front_path: z.string().min(1).max(500),
  id_back_path: z.string().min(1).max(500).optional().nullable(),
  residence_path: z.string().min(1).max(500),
  selfie_path: z.string().min(1).max(500),
});

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.document_type === "rg" && !data.id_back_path) throw new Error("Verso do RG obrigatório");
    // Verify the transaction belongs to the user and requires KYC
    const { data: tx } = await supabase
      .from("transactions").select("*").eq("id", data.transactionId).eq("user_id", userId).maybeSingle();
    if (!tx) throw new Error("Saque não encontrado");
    if (!tx.kyc_required) throw new Error("Verificação não solicitada");

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

    await supabase.from("transactions").update({ kyc_submission_id: sub.id }).eq("id", data.transactionId);
    return { ok: true, submissionId: sub.id };
  });

// User fetches own KYC submission status for a transaction
export const getMyKycForTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transactionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", userId)
      .eq("transaction_id", data.transactionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { submission: sub ?? null };
  });

// Admin: list pending KYC submissions with signed URLs
export const listPendingKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: subs, error } = await supabase
      .from("kyc_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const list = subs ?? [];
    const userIds = [...new Set(list.map((s: any) => s.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id,full_name,username,cpf").in("id", userIds);
    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    // Sign all URLs
    const enriched = await Promise.all(list.map(async (s: any) => ({
      ...s,
      id_front_signed: await signKycPath(s.id_front_url),
      id_back_signed: await signKycPath(s.id_back_url),
      residence_signed: await signKycPath(s.residence_url),
      selfie_signed: await signKycPath(s.selfie_url),
      profile: profMap.get(s.user_id) ?? null,
    })));
    return enriched;
  });

// Admin: approve/reject a KYC submission
export const reviewKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    submissionId: z.string().uuid(),
    approve: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: sub } = await supabase.from("kyc_submissions").select("*").eq("id", data.submissionId).maybeSingle();
    if (!sub) throw new Error("Envio não encontrado");
    if (sub.status !== "pending") throw new Error("Já revisado");

    const { error } = await supabase.from("kyc_submissions").update({
      status: data.approve ? "approved" : "rejected",
      rejection_reason: data.approve ? null : (data.reason ?? "Documentos inválidos"),
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    }).eq("id", data.submissionId);
    if (error) throw new Error(error.message);

    if (data.approve) {
      // mark user as KYC verified and clear kyc_required on the linked transaction so it
      // returns to a clean pending state for admin to finalize approval/rejection.
      await supabase.from("profiles").update({ kyc_verified: true, updated_at: new Date().toISOString() }).eq("id", sub.user_id);
      if (sub.transaction_id) {
        await supabase.from("transactions").update({ kyc_required: false }).eq("id", sub.transaction_id);
      }
    }
    return { ok: true };
  });
