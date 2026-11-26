import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PODPAY_BASE = process.env.PODPAY_BASE_URL || "https://api.podpay.app";

type PodPayResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
};

async function podpay<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const apiKey = process.env.PODPAY_SECRET_KEY || process.env.PODPAY_API_KEY;
  if (!apiKey) throw new Error("PODPAY_SECRET_KEY não configurada");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": apiKey,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;
  const res = await fetch(`${PODPAY_BASE}${path}`, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as PodPayResponse<T>;
  if (!res.ok || !json.success) {
    const msg = json.error?.message || `PodPay HTTP ${res.status}`;
    console.error("PodPay error", res.status, JSON.stringify(json));
    throw new Error(msg);
  }
  return json.data as T;
}

const depositSchema = z.object({
  amount: z.number().positive().max(1000000),
});

type PixTransaction = {
  id: string;
  status: string;
  amount: number;
  pixQrCode?: string;
  pixQrCodeImage?: string;
  createdAt?: string;
};

const PENDING_PIX_MAX_AGE_MS = 20 * 60_000;
const PIX_GENERATION_GRACE_MS = 90_000;

export const createPodPayPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depositSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("./money.server");
    const settings = await m.assertRealMoney("deposit");
    await m.assertActiveGateway("podpay");
    await m.assertNotFrozen(userId);
    if (data.amount < settings.min_deposit || data.amount > settings.max_deposit) {
      throw new Error(
        `Depósito deve ser entre R$ ${settings.min_deposit} e R$ ${settings.max_deposit}`,
      );
    }
    await m.rgCheck(userId, "deposit", data.amount);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,cpf,phone")
      .eq("id", userId)
      .maybeSingle();
    const cpf = (profile?.cpf || "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11)
      throw new Error("CPF não encontrado no cadastro. Atualize seu perfil.");

    const amountCents = Math.round(data.amount * 100);
    const idempotencyKey = crypto.randomUUID();

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
          podpayId: existing.gateway_external_id || "",
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

    const { data: pendingTx, error: pendingError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: data.amount,
        status: "pending",
        description: "PodPay PIX gerando",
        gateway_external_id: idempotencyKey,
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
          podpayId: pending.gateway_external_id || "",
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
    const phone = (profile?.phone || "11999999999").replace(/\D/g, "");

    let result: PixTransaction;
    try {
      result = await podpay<PixTransaction>("/v1/transactions", {
        method: "POST",
        idempotencyKey,
        body: JSON.stringify({
          amount: amountCents,
          paymentMethod: "pix",
          items: [
            {
              id: idempotencyKey,
              title: "Depósito",
              unitPrice: amountCents,
              quantity: 1,
              tangible: false,
            },
          ],
          customer: {
            name: fullName,
            email,
            phone,
            document: { number: cpf, type: "cpf" },
          },
          metadata: { userId, localTransactionId: pendingTx.id },
        }),
      });
    } catch (error) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: "PodPay PIX (falha ao gerar)" })
        .eq("id", pendingTx.id);
      throw error;
    }

    if (!result.pixQrCode) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "rejected", description: `PodPay PIX ${result.id} (sem código PIX)` })
        .eq("id", pendingTx.id);
      throw new Error("PodPay não retornou o código PIX");
    }

    const { data: tx, error } = await supabaseAdmin
      .from("transactions")
      .update({
        description: `PodPay PIX ${result.id}`,
        gateway_external_id: result.id,
        gateway_qrcode: result.pixQrCode,
      })
      .eq("id", pendingTx.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return {
      transactionId: tx.id,
      podpayId: result.id,
      qrCodeImage: result.pixQrCodeImage || "",
      copyPaste: result.pixQrCode || "",
    };
  });
