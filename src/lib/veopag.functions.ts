import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VEOPAG_BASE = process.env.VEOPAG_BASE_URL || "https://api.veopag.com";

type Creds = { clientId: string; clientSecret: string };

async function loadCreds(): Promise<Creds> {
  // Prefer admin-managed DB values; fall back to env vars.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("gateway_credentials")
    .select("key,value")
    .in("key", ["veopag_client_id", "veopag_client_secret"]);
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    if (row.value) map[row.key] = row.value;
  }
  const clientId = map.veopag_client_id || process.env.VEOPAG_CLIENT_ID || "";
  const clientSecret =
    map.veopag_client_secret || process.env.VEOPAG_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Credenciais VeoPag não configuradas. Defina em Admin → Configurações.",
    );
  }
  return { clientId, clientSecret };
}

// Worker isolate token cache (1h validity; refresh at 55min).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 5 * 60_000) {
    return cachedToken.token;
  }
  const { clientId, clientSecret } = await loadCreds();
  const r = await fetch(`${VEOPAG_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    token?: string;
    message?: string;
  };
  if (!r.ok || !j.token) {
    console.error("VeoPag login error", r.status, JSON.stringify(j));
    throw new Error(j.message || `VeoPag auth HTTP ${r.status}`);
  }
  cachedToken = { token: j.token, expiresAt: now + 55 * 60_000 };
  return j.token;
}

async function loadLimits(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      in: (
        k: string,
        v: string[],
      ) => Promise<{ data: { key: string; value: unknown }[] | null }>;
    };
  };
}) {
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

type DepositResponse = {
  message?: string;
  qrCodeResponse?: {
    transactionId: string;
    status: string;
    qrcode: string;
    amount: number;
    fee?: number;
  };
  // Idempotent replay (HTTP 200)
  transaction_id?: string;
  qrcode?: string;
  idempotent?: boolean;
};

const PENDING_PIX_MAX_AGE_MS = 20 * 60_000;
const PIX_GENERATION_GRACE_MS = 90_000;

export const createVeoPagPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ amount: z.number().positive().max(1000000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    let adminClient: { from: (table: string) => any } | null = null;
    const getAdminClient = async () => {
      if (!adminClient) {
        const mod = await import("@/integrations/supabase/client.server");
        adminClient = mod.supabaseAdmin;
      }
      return adminClient;
    };
    const limits = await loadLimits(supabase as never);
    if (data.amount < limits.min_deposit || data.amount > limits.max_deposit) {
      throw new Error(
        `Depósito deve ser entre R$ ${limits.min_deposit} e R$ ${limits.max_deposit}`,
      );
    }

    // Reuse the active PIX or cancel a stuck placeholder before creating another one.
    const { data: existing } = await supabase
      .from("transactions")
      .select("id,amount,gateway_qrcode,gateway_external_id,description,created_at")
      .eq("user_id", userId)
      .eq("type", "deposit")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const ageMs = Date.now() - new Date(existing.created_at).getTime();
      if (existing.gateway_qrcode && ageMs < PENDING_PIX_MAX_AGE_MS) {
        return {
          transactionId: existing.id,
          veopagId: existing.gateway_external_id || "",
          qrCodeImage: "",
          copyPaste: existing.gateway_qrcode,
        };
      }
      if (!existing.gateway_qrcode && ageMs < PIX_GENERATION_GRACE_MS) {
        throw new Error("Seu PIX já está sendo gerado. Aguarde alguns segundos e tente novamente.");
      }
      const admin = await getAdminClient();
      await admin
        .from("transactions")
        .update({
          status: "rejected",
          description: `${existing.description || "SafePix PIX"} (cancelado para gerar novo PIX)`,
        })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .eq("status", "pending");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,cpf,phone")
      .eq("id", userId)
      .maybeSingle();
    const cpf = (profile?.cpf || "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11)
      throw new Error("CPF não encontrado no cadastro. Atualize seu perfil.");

    const externalId = `dep-${userId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: pendingTx, error: pendingError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: data.amount,
        status: "pending",
        description: "SafePix PIX gerando",
        gateway_external_id: externalId,
      })
      .select("id")
      .single();
    if (pendingError) {
      const { data: pending } = await supabase
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
          veopagId: pending.gateway_external_id || "",
          qrCodeImage: "",
          copyPaste: pending.gateway_qrcode,
        };
      }
      throw new Error("Seu PIX já está sendo gerado. Aguarde alguns segundos e tente novamente.");
    }

    const fullName =
      (profile?.full_name && profile.full_name.trim().length > 2
        ? profile.full_name
        : (claims as { email?: string } | undefined)?.email?.split("@")[0]) ||
      "Cliente";
    const email =
      (claims as { email?: string } | undefined)?.email ||
      "no-reply@example.com";
    const phone = (profile?.phone || "").replace(/\D/g, "") || undefined;

    let callbackUrl: string | undefined;
    try {
      const host = getRequestHost();
      if (host) callbackUrl = `https://${host}/api/public/veopag-webhook`;
    } catch {
      callbackUrl = process.env.PUBLIC_APP_URL
        ? `${process.env.PUBLIC_APP_URL}/api/public/veopag-webhook`
        : undefined;
    }

    const token = await getToken();
    const doRequest = async (bearer: string) =>
      fetch(`${VEOPAG_BASE}/api/payments/deposit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(data.amount.toFixed(2)),
          external_id: externalId,
          ...(callbackUrl ? { clientCallbackUrl: callbackUrl } : {}),
          payer: {
            name: fullName,
            email,
            document: cpf,
            ...(phone ? { phone } : {}),
          },
          platform: "SANTOSBET",
        }),
      });

    let res = await doRequest(token);
    if (res.status === 401) {
      cachedToken = null;
      const fresh = await getToken();
      res = await doRequest(fresh);
    }
    const j = (await res.json().catch(() => ({}))) as DepositResponse & {
      message?: string;
    };
    if (!res.ok) {
      console.error("VeoPag deposit error", res.status, JSON.stringify(j));
      throw new Error(j.message || `VeoPag HTTP ${res.status}`);
    }

    const veopagId =
      j.qrCodeResponse?.transactionId || j.transaction_id || externalId;
    const copyPaste = j.qrCodeResponse?.qrcode || j.qrcode || "";
    if (!copyPaste) {
      console.error("VeoPag deposit empty qrcode", JSON.stringify(j));
      throw new Error("VeoPag não retornou o código PIX");
    }

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: data.amount,
        status: "pending",
        description: `SafePix PIX ${veopagId}`,
        gateway_qrcode: copyPaste,
        gateway_external_id: veopagId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return {
      transactionId: tx.id,
      veopagId,
      // VeoPag returns the EMV (Copia e Cola); the client renders the QR from it.
      qrCodeImage: "",
      copyPaste,
    };
  });
