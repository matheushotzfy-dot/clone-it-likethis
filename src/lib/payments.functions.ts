import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createPodPayPixDeposit } from "./podpay.functions";
import { createBSPayPixDeposit } from "./bspay.functions";

export const createPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number().positive().max(1000000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "active_gateway")
      .maybeSingle();
    const gateway = (typeof row?.value === "string" ? row.value : "podpay").toLowerCase();
    if (gateway === "bspay") {
      return await createBSPayPixDeposit({ data });
    }
    return await createPodPayPixDeposit({ data });
  });
