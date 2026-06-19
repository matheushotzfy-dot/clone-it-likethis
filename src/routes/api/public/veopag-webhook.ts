import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-webhook-signature",
};

type VeoPagEvent = {
  type?: "Deposit" | "Withdrawal" | string;
  external_id?: string;
  transaction_id?: string;
  status?: string;
  amount?: number;
  error_code?: string;
  error_message?: string;
};

type WebhookTx = { id: string; status: string };

async function loadSignatureSecret(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("gateway_credentials")
    .select("value")
    .eq("key", "veopag_webhook_signature")
    .maybeSingle();
  const dbVal = (data as { value: string | null } | null)?.value || "";
  return dbVal || process.env.VEOPAG_WEBHOOK_SIGNATURE || "";
}

export const Route = createFileRoute("/api/public/veopag-webhook")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const body = await request.text();

        const expected = await loadSignatureSecret();
        if (expected) {
          const received = request.headers.get("x-webhook-signature") || "";
          const a = Buffer.from(received);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", {
              status: 401,
              headers: corsHeaders,
            });
          }
        }

        let payload: VeoPagEvent;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", {
            status: 400,
            headers: corsHeaders,
          });
        }

        console.log("VeoPag webhook event", JSON.stringify(payload));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const veopagId = payload.transaction_id;
        const externalId = payload.external_id;
        const eventId = veopagId || externalId;
        const status = (payload.status || "").toUpperCase();
        if (!eventId || !status) {
          return new Response("Missing id/status", {
            status: 400,
            headers: corsHeaders,
          });
        }

        const map: Record<string, "approved" | "rejected" | "pending"> = {
          COMPLETED: "approved",
          PAID: "approved",
          PROCESSING: "pending",
          PENDING: "pending",
          QUEUE: "pending",
          FAILED: "rejected",
          REFUNDED: "rejected",
          PARTIALLY_REFUNDED: "rejected",
        };
        const newStatus = map[status] ?? "pending";

        const matchIds = [veopagId, externalId].filter(Boolean) as string[];
        let tx: WebhookTx | null = null;
        if (matchIds.length) {
          const { data } = await supabaseAdmin
            .from("transactions")
            .select("id,status")
            .in("gateway_external_id", matchIds)
            .maybeSingle();
          tx = data as WebhookTx | null;
        }

        if (!tx) {
          const { data } = await supabaseAdmin
            .from("transactions")
            .select("id,status")
            .ilike("description", `%${eventId}%`)
            .maybeSingle();
          tx = data as WebhookTx | null;
        }

        if (!tx) {
          console.warn("VeoPag webhook: no matching tx for", eventId);
          return new Response("ok", { status: 200, headers: corsHeaders });
        }

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
