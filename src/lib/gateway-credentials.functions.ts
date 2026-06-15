import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED_KEYS = [
  "veopag_client_id",
  "veopag_client_secret",
  "veopag_webhook_signature",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

export type GatewayCredentials = Record<AllowedKey, string>;

async function assertAdmin(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: { role: string } | null }>;
        };
      };
    };
  };
}, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

export const getGatewayCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GatewayCredentials> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase as never, userId);
    const { data } = await supabase
      .from("gateway_credentials")
      .select("key,value");
    const out: GatewayCredentials = {
      veopag_client_id: "",
      veopag_client_secret: "",
      veopag_webhook_signature: "",
    };
    for (const row of (data ?? []) as { key: string; value: string | null }[]) {
      if ((ALLOWED_KEYS as readonly string[]).includes(row.key)) {
        out[row.key as AllowedKey] = row.value ?? "";
      }
    }
    return out;
  });

const updateSchema = z
  .object({
    veopag_client_id: z.string().max(200).optional(),
    veopag_client_secret: z.string().max(500).optional(),
    veopag_webhook_signature: z.string().max(500).optional(),
  })
  .strict();

export const updateGatewayCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase as never, userId);
    const rows = Object.entries(data).map(([key, value]) => ({
      key,
      value: (value ?? "") as string,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return { ok: true };
    const { error } = await supabase
      .from("gateway_credentials")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
