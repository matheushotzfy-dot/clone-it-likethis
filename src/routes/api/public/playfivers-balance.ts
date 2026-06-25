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

export const Route = createFileRoute("/api/public/playfivers-balance")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let payload: any = null;
        try { payload = await request.json(); } catch { return json({ balance: 0, msg: "BAD_JSON" }, 400); }

        const userCode = payload?.user_code;
        if (!userCode || typeof userCode !== "string") {
          return json({ balance: 0, msg: "INVALID_USER" }, 404);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: prof, error } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", userCode)
          .maybeSingle();

        if (error) {
          console.error("playfivers-balance error", error);
          return json({ balance: 0, msg: "ERROR_INTERNAL" }, 500);
        }
        if (!prof) return json({ balance: 0, msg: "INVALID_USER" }, 404);

        return json({ balance: Number(prof.balance ?? 0), msg: "" });
      },
    },
  },
});
