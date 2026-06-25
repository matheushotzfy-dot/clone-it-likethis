import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

export const Route = createFileRoute("/api/public/playfivers-transaction")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const expectedCode = process.env.PLAYFIVERS_AGENT_CODE;
        const expectedSecret = process.env.PLAYFIVERS_SECRET_KEY;

        let payload: any = null;
        try { payload = await request.json(); } catch { return json({ balance: 0, msg: "BAD_JSON" }, 400); }

        // Verify agent credentials when both sides provide them
        if (expectedCode && payload?.agent_code && payload.agent_code !== expectedCode) {
          return json({ balance: 0, msg: "INVALID_AGENT" }, 401);
        }
        if (expectedSecret && payload?.agent_secret && payload.agent_secret !== expectedSecret) {
          return json({ balance: 0, msg: "INVALID_AGENT" }, 401);
        }

        const userCode = payload?.user_code;
        if (!userCode || typeof userCode !== "string") {
          return json({ balance: 0, msg: "INVALID_USER" }, 404);
        }

        const gameType: string = String(payload?.game_type ?? "slot");
        const tx = payload?.[gameType] ?? payload?.slot ?? {};
        const txnId: string | undefined = tx?.txn_id;
        if (!txnId) return json({ balance: 0, msg: "MISSING_TXN_ID" }, 400);

        const bet = Number(tx?.bet ?? 0) || 0;
        const win = Number(tx?.win ?? 0) || 0;
        const roundId: string | null = tx?.round_id ?? null;
        const provider: string | null = tx?.provider_code ?? null;
        const gameCode: string | null = tx?.game_code ?? null;
        const txnType: string | null = tx?.txn_type ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve user
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("id,is_frozen,balance")
          .eq("id", userCode)
          .maybeSingle();
        if (!prof) return json({ balance: 0, msg: "INVALID_USER" }, 404);
        if (prof.is_frozen) return json({ balance: Number(prof.balance ?? 0), msg: "USER_FROZEN" }, 403);

        const { data: newBalance, error } = await supabaseAdmin.rpc("apply_playfivers_transaction", {
          p_user_id: prof.id,
          p_txn_id: txnId,
          p_round_id: roundId ?? "",
          p_provider: provider ?? "",
          p_game_code: gameCode ?? "",
          p_game_type: gameType,
          p_txn_type: txnType ?? "",
          p_bet: bet,
          p_win: win,
          p_payload: payload,
        });

        if (error) {
          const msg = error.message || "";
          if (msg.includes("INSUFFICIENT_BALANCE")) {
            return json({ balance: Number(prof.balance ?? 0), msg: "INSUFFICIENT_BALANCE" }, 402);
          }
          if (msg.includes("USER_NOT_FOUND")) {
            return json({ balance: 0, msg: "INVALID_USER" }, 404);
          }
          console.error("playfivers-transaction rpc error", error);
          return json({ balance: 0, msg: "ERROR_INTERNAL" }, 500);
        }

        return json({ balance: Number(newBalance ?? 0), msg: "" });
      },
    },
  },
});
