import { createFileRoute } from "@tanstack/react-router";

// URL de callback no painel da PlayFivers: https://SEU_DOMINIO/api/public/playfivers/<PLAYFIVERS_CALLBACK_TOKEN>
// A PlayFivers chama {base}/webhook para consultar saldo.
export const Route = createFileRoute("/api/public/playfivers/$token/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/playfivers-webhook.server")).pfOptions(),
      POST: async ({ request, params }) => {
        const { handlePlayFiversCallback } = await import("@/lib/playfivers-webhook.server");
        return handlePlayFiversCallback(request, params.token, "balance");
      },
    },
  },
});
