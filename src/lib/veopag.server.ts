// Server-only VeoPag helpers: auth, status lookup and safe crediting.
export const VEOPAG_BASE = "https://api.veopag.co";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function loadCreds() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("gateway_credentials")
    .select("key,value")
    .in("key", ["veopag_client_id", "veopag_client_secret"]);
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string | null }[]) if (r.value) map[r.key] = r.value;
  // Project secrets win; admin-panel values are a fallback.
  const clientId = process.env.VEOPAG_CLIENT_ID || map.veopag_client_id || "";
  const clientSecret = process.env.VEOPAG_CLIENT_SECRET || map.veopag_client_secret || "";
  if (!clientId || !clientSecret) throw new Error("Credenciais VeoPag não configuradas.");
  return { clientId, clientSecret };
}

export function resetVeoPagToken() {
  cachedToken = null;
}

export async function getVeoPagToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 5 * 60_000) return cachedToken.token;
  const { clientId, clientSecret } = await loadCreds();
  const r = await fetch(`${VEOPAG_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const j = (await r.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!r.ok || !j.token) {
    console.error("VeoPag login error", r.status, j.message);
    throw new Error(j.message || `VeoPag auth HTTP ${r.status}`);
  }
  cachedToken = { token: j.token, expiresAt: now + 55 * 60_000 };
  return j.token;
}

export type VeoPagDeposit = { transaction_id?: string; external_id?: string | null; amount?: number; status?: string };

/** Ask VeoPag for the authoritative deposit state (never trust webhook bodies). */
export async function fetchVeoPagDeposit(externalId: string): Promise<VeoPagDeposit | null> {
  const call = async (t: string) =>
    fetch(`${VEOPAG_BASE}/api/transactions/deposit?external_id=${encodeURIComponent(externalId)}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
  let res = await call(await getVeoPagToken());
  if (res.status === 401) {
    resetVeoPagToken();
    res = await call(await getVeoPagToken());
  }
  if (!res.ok) {
    console.error("VeoPag lookup error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const j = (await res.json().catch(() => ({}))) as { deposit?: VeoPagDeposit | null };
  return j.deposit ?? null;
}

export type DepositDecision = "approved" | "rejected" | "pending";

/** Pure rule: approve only a paid status whose paid amount covers the requested amount. */
export function decideDeposit(status: string | undefined, paid: number | undefined, requested: number): DepositDecision {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "PAID", "APPROVED"].includes(s)) {
    return Number(paid) + 0.001 >= Number(requested) ? "approved" : "pending";
  }
  if (["FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELED", "CANCELLED", "EXPIRED"].includes(s)) return "rejected";
  return "pending";
}

/**
 * Verify a local pending deposit against VeoPag and apply the result once.
 * The status update is guarded by `status = pending`, so the balance trigger
 * fires at most one time even with concurrent webhook + polling calls.
 */
export async function syncDepositByExternalId(externalId: string): Promise<DepositDecision | "unknown"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .select("id,status,amount")
    .eq("gateway_external_id", externalId)
    .eq("type", "deposit")
    .maybeSingle();
  if (!tx) return "unknown";
  if (tx.status !== "pending") return tx.status as DepositDecision;
  const remote = await fetchVeoPagDeposit(externalId);
  if (!remote) return "pending";
  const decision = decideDeposit(remote.status, remote.amount, Number(tx.amount));
  if (decision !== "pending") {
    await supabaseAdmin
      .from("transactions")
      .update({ status: decision })
      .eq("id", tx.id)
      .eq("status", "pending");
  }
  return decision;
}
