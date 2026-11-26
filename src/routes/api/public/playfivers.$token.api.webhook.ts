import { createFileRoute } from "@tanstack/react-router";

// A PlayFivers chama {base}/api/webhook para aposta/ganho (WinBet) e estorno (Refund).
export const Route = createFileRoute("/api/public/playfivers/$token/api/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/playfivers-webhook.server")).pfOptions(),
      POST: async ({ request, params }) => {
        const { handlePlayFiversCallback } = await import("@/lib/playfivers-webhook.server");
        return handlePlayFiversCallback(request, params.token, "transaction");
      },
    },
  },
});
