import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AppSettings = {
  min_deposit: number;
  max_deposit: number;
  min_withdraw: number;
  max_withdraw: number;
  withdrawal_fee_pct: number;
  welcome_bonus: number;
  maintenance_mode: boolean;
};

const DEFAULTS: AppSettings = {
  min_deposit: 20,
  max_deposit: 10000,
  min_withdraw: 50,
  max_withdraw: 5000,
  withdrawal_fee_pct: 0,
  welcome_bonus: 0,
  maintenance_mode: false,
};

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppSettings> => {
    const { supabase } = context;
    const { data } = await supabase.from("app_settings").select("key,value");
    const out = { ...DEFAULTS };
    for (const row of data ?? []) {
      const k = row.key as keyof AppSettings;
      // value is jsonb — already typed
      (out as Record<string, unknown>)[k] = row.value as never;
    }
    return out;
  });

const updateSchema = z.object({
  min_deposit: z.number().min(1).max(100000).optional(),
  max_deposit: z.number().min(1).max(1000000).optional(),
  min_withdraw: z.number().min(1).max(100000).optional(),
  max_withdraw: z.number().min(1).max(1000000).optional(),
  withdrawal_fee_pct: z.number().min(0).max(100).optional(),
  welcome_bonus: z.number().min(0).max(100000).optional(),
  maintenance_mode: z.boolean().optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Acesso negado");
    const rows = Object.entries(data).map(([key, value]) => ({ key, value: value as never, updated_at: new Date().toISOString() }));
    if (rows.length === 0) return { ok: true };
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
