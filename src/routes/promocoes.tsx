import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/promocoes")({
  head: () => ({ meta: pageMeta('Promoções — apostamaxy', 'Confira as melhores promoções de cassino e apostas.') }),
  component: () => (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Promoções</h1>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: "PIX na hora", desc: "Depósitos confirmados automaticamente em segundos", cta: "Depositar" },
            { title: "Saque por PIX", desc: "Peça seu saque direto para sua chave PIX", cta: "Sacar" },
            { title: "Odds reais", desc: "Jogos e cotações atualizados direto da fonte", cta: "Apostar" },
            { title: "Sem letras miúdas", desc: "Sem bônus com rollover: seu saldo é só seu", cta: "Jogar" },
          ].map((p) => (
            <div key={p.title} className="bg-surface border border-border rounded-xl p-6 flex gap-4">
              <div className="size-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Gift className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{p.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{p.desc}</p>
                <Button size="sm" className="mt-3">{p.cta}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  ),
});
