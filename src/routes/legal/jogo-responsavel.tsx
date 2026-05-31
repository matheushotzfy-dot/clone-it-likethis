import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";

export const Route = createFileRoute("/legal/jogo-responsavel")({
  head: () => ({ meta: [{ title: "Jogo Responsável — SANTOSBET" }] }),
  component: () => (
    <SiteShell>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-3xl font-bold">Jogo Responsável</h1>
        <p className="text-muted-foreground">Apostas devem ser feitas com responsabilidade e diversão. Não as encare como fonte de renda.</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2">
          <li>Defina limites de tempo e dinheiro.</li>
          <li>Nunca persiga perdas.</li>
          <li>Faça pausas regulares.</li>
          <li>Se precisar de ajuda, procure: <strong className="text-foreground">Jogadores Anônimos Brasil</strong></li>
        </ul>
      </div>
    </SiteShell>
  ),
});
