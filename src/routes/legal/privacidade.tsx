import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";

export const Route = createFileRoute("/legal/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade — SANTOSBET" }] }),
  component: () => (
    <SiteShell>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        <p className="text-muted-foreground">Coletamos apenas as informações estritamente necessárias para criação de conta de demonstração: email, nome e dados opcionais de perfil.</p>
        <p className="text-muted-foreground mt-4">Nenhum dado é compartilhado com terceiros. Este é um projeto de estudo.</p>
      </div>
    </SiteShell>
  ),
});
