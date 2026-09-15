import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";

export const Route = createFileRoute("/legal/termos")({
  head: () => ({ meta: [{ title: "Termos de Uso — APOSTAYA.BET" }, { property: "og:title", content: "Termos de Uso — APOSTAYA.BET" }] }),
  component: () => (
    <SiteShell>
      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-invert">
        <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
        <p className="text-muted-foreground">Este é um projeto de demonstração criado para fins de estudo. Não representa um operador real de apostas.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">1. Idade mínima</h2>
        <p className="text-muted-foreground">Apenas maiores de 18 anos podem utilizar o site.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">2. Jogo responsável</h2>
        <p className="text-muted-foreground">Jogue com moderação. Defina limites e nunca aposte o que não pode perder.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">3. Demonstração</h2>
        <p className="text-muted-foreground">Todos os jogos exibidos são placeholders visuais. Nenhuma aposta real é processada.</p>
      </div>
    </SiteShell>
  ),
});
