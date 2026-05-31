import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-podpay-signature",
};

export const Route = createFileRoute("/api/public/podpay-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const secret = process.env.PODPAY_WEBHOOK_SECRET;
        const body = await request.text();
        const signature = request.headers.get("x-podpay-signature") || request.headers.get("x-signature");

        if (secret && signature) {
          try {
            const expected = createHmac("sha256", secret).update(body).digest("hex");
            const a = Buffer.from(signature);
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("Invalid signature", { status: 401, headers: corsHeaders });
            }
          } catch {
            return new Response("Invalid signature", { status: 401, headers: corsHeaders });
          }
        }

        let payload: any;
        try { payload = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400, headers: corsHeaders }); }

        const podpayId: string | undefined = payload?.data?.id || payload?.transactionId || payload?.id;
        const status: string | undefined = payload?.data?.status || payload?.status;
        if (!podpayId || !status) return new Response("Missing id/status", { status: 400, headers: corsHeaders });

        // Find our transaction by description containing the podpay id
        const { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("id,status")
          .ilike("description", `%${podpayId}%`)
          .maybeSingle();

        if (!tx) return new Response("ok", { status: 200, headers: corsHeaders });

        const map: Record<string, "approved" | "rejected" | "pending"> = {
          paid: "approved",
          completed: "approved",
          failed: "rejected",
          cancelled: "rejected",
          refunded: "rejected",
          pending: "pending",
          processing: "pending",
        };
        const newStatus = map[status] ?? "pending";
        if (newStatus !== "pending" && tx.status === "pending") {
          await supabaseAdmin.from("transactions").update({ status: newStatus }).eq("id", tx.id);
        }
        return new Response("ok", { status: 200, headers: corsHeaders });
      },
    },
  },
});
