import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PODPAY_BASE = process.env.PODPAY_BASE_URL || "https://api.podpay.app";

type PodPayResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

async function podpay<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const publicKey = process.env.PODPAY_PUBLIC_KEY;
  const secretKey = process.env.PODPAY_SECRET_KEY;
  if (!publicKey || !secretKey) throw new Error("PODPAY_PUBLIC_KEY/PODPAY_SECRET_KEY não configurados");
  const basic = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;
  const res = await fetch(`${PODPAY_BASE}${path}`, { ...init, headers });
  const json = (await res.json()) as PodPayResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `PodPay ${res.status}`);
  }
  return json.data as T;
}

const depositSchema = z.object({
  amount: z.number().min(5).max(10000),
  cpf: z.string().min(11).max(14).optional(),
});

type PixDeposit = {
  id: string;
  status: string;
  pix?: { qrCode?: string; qrCodeBase64?: string; copyPaste?: string };
};

export const createPodPayPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depositSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: profile } = await supabase.from("profiles").select("full_name,cpf").eq("id", userId).maybeSingle();
    const cpf = (data.cpf || profile?.cpf || "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11) throw new Error("CPF obrigatório no perfil");

    const idempotencyKey = crypto.randomUUID();
    const result = await podpay<PixDeposit>("/v1/transactions", {
      method: "POST",
      idempotencyKey,
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        paymentMethod: "PIX",
        customer: {
          name: profile?.full_name || claims?.email || "Cliente",
          email: claims?.email,
          document: { type: "CPF", number: cpf },
        },
        metadata: { userId },
      }),
    });

    // Persist a pending transaction
    const { data: tx, error } = await supabase.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: data.amount,
      status: "pending",
      description: `PodPay PIX ${result.id}`,
    }).select().single();
    if (error) throw new Error(error.message);

    return {
      transactionId: tx.id,
      podpayId: result.id,
      qrCode: result.pix?.qrCodeBase64 || result.pix?.qrCode || "",
      copyPaste: result.pix?.copyPaste || "",
    };
  });

const withdrawalSchema = z.object({
  amount: z.number().min(50).max(5000),
  pixKey: z.string().min(3).max(120),
  pixKeyType: z.enum(["cpf", "email", "phone", "random"]),
});

export const createPodPayPixWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withdrawalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("balance").eq("id", userId).maybeSingle();
    if (!profile || Number(profile.balance) < data.amount) throw new Error("Saldo insuficiente");

    const { data: tx, error } = await supabase.from("transactions").insert({
      user_id: userId,
      type: "withdrawal",
      amount: data.amount,
      status: "pending",
      pix_key: `${data.pixKeyType}:${data.pixKey}`,
      description: "Saque PIX via PodPay (aguardando aprovação)",
    }).select().single();
    if (error) throw new Error(error.message);

    return { ok: true, transactionId: tx.id };
  });
