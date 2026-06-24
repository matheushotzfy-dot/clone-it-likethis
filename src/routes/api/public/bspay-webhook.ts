import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Webhook-Signature, X-Webhook-Timestamp, X-Webhook-Event, X-Webhook-Id",
};

type BSPayEvent = {
  event?: string;
  transaction_id?: string;
  data?: {
    transaction_id?: string;
    status?: string;
    external_id?: string;
  };
};

export const Route = createFileRoute("/api/public/bspay-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const secret = process.env.BSPAY_WEBHOOK_SECRET;
        const body = await request.text();
        const signature = request.headers.get("x-webhook-signature");
        const ts = Number(request.headers.get("x-webhook-timestamp") || 0);

        if (secret) {
          if (!signature) {
            return new Response("Missing signature", { status: 401, headers: corsHeaders });
          }
          if (ts && Math.abs(Date.now() / 1000 - ts) > 300) {
            return new Response("Stale timestamp", { status: 401, headers: corsHeaders });
          }
          try {
            const expected = createHmac("sha256", secret).update(body).digest("hex");
            const a = Buffer.from(signature.replace(/^sha256=/, "").trim());
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("Invalid signature", { status: 401, headers: corsHeaders });
            }
          } catch {
            return new Response("Invalid signature", { status: 401, headers: corsHeaders });
          }
        }

        let payload: BSPayEvent;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400, headers: corsHeaders });
        }

        console.log("BSPay webhook", JSON.stringify(payload));
        const bspayId = payload.data?.transaction_id || payload.transaction_id;
        const event = (payload.event || "").toLowerCase();
        if (!bspayId) {
          return new Response("Missing id", { status: 400, headers: corsHeaders });
        }

        let { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("id,status")
          .eq("gateway_external_id", bspayId)
          .maybeSingle();
        if (!tx) {
          const fallback = await supabaseAdmin
            .from("transactions")
            .select("id,status")
            .ilike("description", `%${bspayId}%`)
            .maybeSingle();
          tx = fallback.data;
        }
        if (!tx) return new Response("ok", { status: 200, headers: corsHeaders });

        let newStatus: "approved" | "rejected" | "pending" = "pending";
        if (event.startsWith("cashin.confirmed")) newStatus = "approved";
        else if (event.startsWith("cashin.refunded") || event.startsWith("cashin.expired"))
          newStatus = "rejected";

        if (newStatus !== "pending" && tx.status === "pending") {
          await supabaseAdmin.from("transactions").update({ status: newStatus }).eq("id", tx.id);
        }
        return new Response("ok", { status: 200, headers: corsHeaders });
      },
    },
  },
});
