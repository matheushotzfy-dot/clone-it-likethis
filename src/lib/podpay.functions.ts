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
  init: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const apiKey =
    process.env.PODPAY_SECRET_KEY ||
    process.env.PODPAY_API_KEY;
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

async function loadLimits(supabase: { from: (t: string) => { select: (c: string) => { in: (k: string, v: string[]) => Promise<{ data: { key: string; value: unknown }[] | null }> } } }) {
  const { data } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["min_deposit", "max_deposit", "min_withdraw", "max_withdraw"]);
  const out: Record<string, number> = { min_deposit: 30, max_deposit: 3000, min_withdraw: 50, max_withdraw: 5000 };
  for (const row of data ?? []) {
    const n = Number(row.value);
    if (Number.isFinite(n)) out[row.key] = n;
  }
  return out;
}

type PixTransaction = {
  id: string;
  status: string;
  amount: number;
  pixQrCode?: string;
  pixQrCodeImage?: string;
  createdAt?: string;
};

export const createPodPayPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depositSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
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


    const amountCents = Math.round(data.amount * 100);
    const idempotencyKey = crypto.randomUUID();
    const fullName =
      (profile?.full_name && profile.full_name.trim().length > 2
        ? profile.full_name
        : (claims as { email?: string } | undefined)?.email?.split("@")[0]) ||
      "Cliente";
    const email =
      (claims as { email?: string } | undefined)?.email || "no-reply@example.com";
    const phone = (profile?.phone || "11999999999").replace(/\D/g, "");

    const result = await podpay<PixTransaction>("/v1/transactions", {
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
        metadata: { userId },
      }),
    });

    // Cancel any prior pending deposit (one-pending-per-user constraint)
    await supabase
      .from("transactions")
      .update({ status: "rejected", description: "Cancelado — novo PIX gerado" })
      .eq("user_id", userId)
      .eq("type", "deposit")
      .eq("status", "pending");

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: data.amount,
        status: "pending",
        description: `PodPay PIX ${result.id}`,
      })
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

const withdrawalSchema = z.object({
  amount: z.number().positive().max(1000000),
  pixKey: z.string().min(3).max(120),
  pixKeyType: z.enum(["cpf", "email", "phone", "random"]),
});

export const createPodPayPixWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withdrawalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const limits = await loadLimits(supabase as never);
    if (data.amount < limits.min_withdraw || data.amount > limits.max_withdraw) {
      throw new Error(`Saque deve ser entre R$ ${limits.min_withdraw} e R$ ${limits.max_withdraw}`);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || Number(profile.balance) < data.amount)
      throw new Error("Saldo insuficiente");

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal",
        amount: data.amount,
        status: "pending",
        pix_key: `${data.pixKeyType}:${data.pixKey}`,
        description: "Saque PIX via PodPay (aguardando aprovação)",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { ok: true, transactionId: tx.id };
  });
