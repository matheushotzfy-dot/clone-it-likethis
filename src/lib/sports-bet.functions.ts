import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  matchId: z.string().min(1).max(80),
  pick: z.enum(["home", "draw", "away"]),
  odd: z.number().min(1.01).max(1000),
  stake: z.number().min(1).max(50000),
  description: z.string().max(200).optional(),
});

export const placeSportsBet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rpcData, error } = await supabase.rpc("place_sports_bet", {
      p_user_id: userId,
      p_stake: data.stake,
      p_odd: data.odd,
      p_match_id: data.matchId,
      p_pick: data.pick,
      p_description: data.description ?? "Aposta esportiva",
    });
    if (error) {
      const msg = error.message.includes("INSUFFICIENT_BALANCE")
        ? "INSUFFICIENT_BALANCE"
        : error.message;
      return { ok: false as const, error: msg };
    }
    return { ok: true as const, newBalance: Number(rpcData) };
  });
