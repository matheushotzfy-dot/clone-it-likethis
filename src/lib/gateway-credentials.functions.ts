import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard";

const KEYS = ["veopag_client_id", "veopag_client_secret", "veopag_webhook_signature"] as const;
type Key = (typeof KEYS)[number];

export interface CredentialStatus {
  set: boolean;
  hint: string;
}

/** Segredos nunca voltam inteiros para o navegador: só se existem e os 4 últimos caracteres. */
export const getGatewayCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<Key, CredentialStatus>> => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("gateway_credentials")
      .select("key,value")
      .in("key", [...KEYS]);
    const out = Object.fromEntries(KEYS.map((k) => [k, { set: false, hint: "" }])) as Record<
      Key,
      CredentialStatus
    >;
    for (const row of data ?? []) {
      const v = row.value ?? "";
      if (v)
        out[row.key as Key] = {
          set: true,
          hint: row.key === "veopag_client_id" ? v : `…${v.slice(-4)}`,
        };
    }
    return out;
  });

/** Campo vazio = não mexe. Para apagar um valor, use clear. */
export const updateGatewayCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        veopag_client_id: z.string().trim().max(200).optional(),
        veopag_client_secret: z.string().trim().max(500).optional(),
        veopag_webhook_signature: z.string().trim().max(500).optional(),
        clear: z.array(z.enum(KEYS)).optional(),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const now = new Date().toISOString();
    const rows = KEYS.filter((k) => data[k]).map((k) => ({
      key: k,
      value: data[k] as string,
      updated_at: now,
    }));
    for (const k of data.clear ?? []) rows.push({ key: k, value: "", updated_at: now });
    if (!rows.length) return { ok: true };
    const { error } = await context.supabase
      .from("gateway_credentials")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await context.supabase.rpc("admin_log", {
      p_action: "gateway.update",
      p_details: { keys: rows.map((r) => r.key) } as never,
    });
    return { ok: true };
  });
