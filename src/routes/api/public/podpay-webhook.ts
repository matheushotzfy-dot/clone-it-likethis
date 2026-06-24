import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-podpay-signature, x-signature, x-webhook-signature",
};

type PodPayEvent = {
  event?: string;
  type?: string;
  id?: string;
  transactionId?: string;
  data?: {
    id?: string;
    status?: string;
    amount?: number;
    paymentMethod?: string;
    metadata?: Record<string, unknown>;
  };
  status?: string;
};

export const Route = createFileRoute("/api/public/podpay-webhook")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const secret = process.env.PODPAY_WEBHOOK_SECRET;
        const body = await request.text();
        const signature =
          request.headers.get("x-podpay-signature") ||
          request.headers.get("x-signature") ||
          request.headers.get("x-webhook-signature");

        if (secret && signature) {
          try {
            const expected = createHmac("sha256", secret)
              .update(body)
              .digest("hex");
            // Accept hex or "sha256=..." prefix
            const provided = signature.replace(/^sha256=/, "").trim();
            const a = Buffer.from(provided);
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              console.warn("PodPay webhook: invalid signature");
              return new Response("Invalid signature", {
                status: 401,
                headers: corsHeaders,
              });
            }
          } catch (e) {
            console.warn("PodPay webhook: signature check error", e);
            return new Response("Invalid signature", {
              status: 401,
              headers: corsHeaders,
            });
          }
        }

        let payload: PodPayEvent;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", {
            status: 400,
            headers: corsHeaders,
          });
        }

        console.log("PodPay webhook event", JSON.stringify(payload));

        const podpayId = payload?.data?.id || payload?.transactionId || payload?.id;
        const localTransactionId =
          typeof payload?.data?.metadata?.localTransactionId === "string"
            ? payload.data.metadata.localTransactionId
            : undefined;
        const status = payload?.data?.status || payload?.status;
        if (!podpayId || !status) {
          return new Response("Missing id/status", {
            status: 400,
            headers: corsHeaders,
          });
        }

        let tx: { id: string; status: string } | null = null;
        if (localTransactionId) {
          const byLocalId = await supabaseAdmin
            .from("transactions")
            .select("id,status")
            .eq("id", localTransactionId)
            .maybeSingle();
          tx = byLocalId.data;
        }

        if (!tx) {
          const byGatewayId = await supabaseAdmin
            .from("transactions")
            .select("id,status")
            .eq("gateway_external_id", podpayId)
            .maybeSingle();
          tx = byGatewayId.data;
        }

        if (!tx) {
          const fallback = await supabaseAdmin
            .from("transactions")
            .select("id,status")
            .ilike("description", `%${podpayId}%`)
            .maybeSingle();
          tx = fallback.data;
        }

        if (!tx) {
          console.warn("PodPay webhook: no matching tx for", podpayId);
          return new Response("ok", { status: 200, headers: corsHeaders });
        }

        const map: Record<string, "approved" | "rejected" | "pending"> = {
          paid: "approved",
          completed: "approved",
          approved: "approved",
          failed: "rejected",
          cancelled: "rejected",
          canceled: "rejected",
          refunded: "rejected",
          blocked: "rejected",
          chargeback: "rejected",
          pre_chargeback: "pending",
          pending: "pending",
          processing: "pending",
        };
        const newStatus = map[status.toLowerCase()] ?? "pending";
        if (newStatus !== "pending" && tx.status === "pending") {
          await supabaseAdmin
            .from("transactions")
            .update({ status: newStatus })
            .eq("id", tx.id);
        }
        return new Response("ok", { status: 200, headers: corsHeaders });
      },
    },
  },
});
