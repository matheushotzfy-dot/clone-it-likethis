import { createFileRoute } from "@tanstack/react-router";

// Rota antiga, mantida por compatibilidade. Exige credenciais do agente no corpo.
export const Route = createFileRoute("/api/public/playfivers-transaction")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/playfivers-webhook.server")).pfOptions(),
      POST: async ({ request }) => {
        const { handlePlayFiversCallback } = await import("@/lib/playfivers-webhook.server");
        return handlePlayFiversCallback(request, undefined, "any");
      },
    },
  },
});
