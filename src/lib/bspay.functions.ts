import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BSPAY_BASE = process.env.BSPAY_BASE_URL || "https://api.bspay.co";

async function getAccessToken(): Promise<string> {
  const id = process.env.BSPAY_CLIENT_ID;
  const secret = process.env.BSPAY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Credenciais BSPay não configuradas");
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const r = await fetch(`${BSPAY_BASE}/v2/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  const j: { access_token?: string; error?: { message?: string } } = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    console.error("BSPay token error", r.status, JSON.stringify(j));
    throw new Error(j.error?.message || `BSPay auth HTTP ${r.status}`);
  }
  return j.access_token;
}

async function loadLimits(supabase: { from: (t: string) => { select: (c: string) => { in: (k: string, v: string[]) => Promise<{ data: { key: string; value: unknown }[] | null }> } } }) {
  const { data } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["min_deposit", "max_deposit"]);
  const out: Record<string, number> = { min_deposit: 30, max_deposit: 3000 };
  for (const row of data ?? []) {
    const n = Number(row.value);
    if (Number.isFinite(n)) out[row.key] = n;
  }
  return out;
}

type CashinResponse = {
  transaction_id: string;
  payment_info?: { qrcode?: string; qrcode_image?: string };
};

const PENDING_PIX_MAX_AGE_MS = 20 * 60_000;
const PIX_GENERATION_GRACE_MS = 90_000;

export const createBSPayPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number().positive().max(1000000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limits = await loadLimits(supabase as never);
    if (data.amount < limits.min_deposit || data.amount > limits.max_deposit) {
      throw new Error(`Depósito deve ser entre R$ ${limits.min_deposit} e R$ ${limits.max_deposit}`);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,cpf,phone")
      .eq("id", userId)
      .maybeSingle();
    const cpf = (profile?.cpf || "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11)
      throw new Error("CPF não encontrado no cadastro. Atualize seu perfil.");

    const { data: existing } = await supabaseAdmin
      .from("transactions")
      .select("id,amount,gateway_qrcode,gateway_external_id,created_at")
      .eq("user_id", userId)
      .eq("type", "deposit")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const ageMs = Date.now() - new Date(existing.created_at).getTime();
      const sameAmount = Number(existing.amount) === Number(data.amount);
      if (sameAmount && existing.gateway_qrcode && ageMs < PENDING_PIX_MAX_AGE_MS) {
        return {
          transactionId: existing.id,
          bspayId: existing.gateway_external_id || "",
          qrCodeImage: "",
          copyPaste: existing.gateway_qrcode,
        };
      }
      if (sameAmount && !existing.gateway_qrcode && ageMs < PIX_GENERATION_GRACE_MS) {
        throw new Error("Seu PIX já está sendo gerado. Aguarde alguns segundos e tente novamente.");
      }
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: "Cancelado — novo PIX gerado" })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .eq("status", "pending");
    }

    const token = await getAccessToken();
    const externalId = crypto.randomUUID();
    const { data: pendingTx, error: pendingError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: data.amount,
        status: "pending",
        description: "BSPay PIX gerando",
        gateway_external_id: externalId,
      })
      .select("id")
      .single();
    if (pendingError) {
      const { data: pending } = await supabaseAdmin
        .from("transactions")
        .select("id,gateway_qrcode,gateway_external_id")
        .eq("user_id", userId)
        .eq("type", "deposit")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending?.gateway_qrcode) {
        return {
          transactionId: pending.id,
          bspayId: pending.gateway_external_id || "",
          qrCodeImage: "",
          copyPaste: pending.gateway_qrcode,
        };
      }
      throw new Error("Seu PIX já está sendo gerado. Aguarde alguns segundos e tente novamente.");
    }

    const fullName =
      (profile?.full_name && profile.full_name.trim().length > 2
        ? profile.full_name
        : (claims as { email?: string } | undefined)?.email?.split("@")[0]) || "Cliente";
    const email = (claims as { email?: string } | undefined)?.email || "no-reply@example.com";

    // Build dynamic origin to construct postback url
    const postbackBase = process.env.PUBLIC_APP_URL || "";
    const postbackUrl = postbackBase ? `${postbackBase}/api/public/bspay-webhook` : undefined;

    let r: Response;
    try {
      r = await fetch(`${BSPAY_BASE}/v2/transactions/cashin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: "BRL",
          external_id: externalId,
          payer: { name: fullName, document: cpf, email },
          ...(postbackUrl ? { postback_url: postbackUrl } : {}),
        }),
      });
    } catch (error) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: `BSPay PIX ${externalId} (falha ao gerar)` })
        .eq("id", pendingTx.id);
      throw error;
    }
    const j: { success?: boolean; data?: CashinResponse; error?: { message?: string } } = await r
      .json()
      .catch(() => ({}));
    if (!r.ok || !j.success || !j.data) {
      console.error("BSPay cashin error", r.status, JSON.stringify(j));
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: `BSPay PIX ${externalId} (falha ao gerar)` })
        .eq("id", pendingTx.id);
      throw new Error(j.error?.message || `BSPay HTTP ${r.status}`);
    }
    const qrcode = j.data.payment_info?.qrcode || "";
    const qrcodeImage = j.data.payment_info?.qrcode_image || "";
    if (!qrcode) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: `BSPay PIX ${j.data.transaction_id} (sem código PIX)` })
        .eq("id", pendingTx.id);
      throw new Error("BSPay não retornou o código PIX");
    }

    const { data: tx, error } = await supabaseAdmin
      .from("transactions")
      .update({
        description: `BSPay PIX ${j.data.transaction_id}`,
        gateway_external_id: j.data.transaction_id,
        gateway_qrcode: qrcode,
      })
      .eq("id", pendingTx.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return {
      transactionId: tx.id,
      bspayId: j.data.transaction_id,
      qrCodeImage: qrcodeImage,
      copyPaste: qrcode,
    };
  });
