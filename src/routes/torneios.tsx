import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/torneios")({
  head: () => ({ meta: [{ title: "Torneios — PIXBET" }] }),
  component: () => (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">🏆 Torneios</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Caça-Níquel Mania", prize: "R$ 100.000", end: "3 dias" },
            { name: "Crash Battle", prize: "R$ 50.000", end: "5 dias" },
            { name: "Roleta Royale", prize: "R$ 75.000", end: "1 semana" },
            { name: "Blackjack Champions", prize: "R$ 25.000", end: "2 dias" },
            { name: "Slot Showdown", prize: "R$ 200.000", end: "10 dias" },
            { name: "Aviator Cup", prize: "R$ 30.000", end: "4 dias" },
          ].map((t) => (
            <div key={t.name} className="bg-surface border border-border rounded-xl p-5 hover:border-primary transition-colors">
              <Trophy className="size-8 text-primary mb-3" />
              <h3 className="font-bold mb-1">{t.name}</h3>
              <p className="text-2xl font-black text-primary">{t.prize}</p>
              <p className="text-sm text-muted-foreground mt-2">Termina em {t.end}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  ),
});
