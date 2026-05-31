import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/esportes")({
  head: () => ({ meta: [{ title: "Esportes — PIXBET" }] }),
  component: Page,
});

const matches = [
  { league: "Brasileirão Série A", home: "Flamengo", away: "Palmeiras", odds: { h: 2.1, d: 3.2, a: 3.5 }, time: "Hoje 21:30" },
  { league: "Brasileirão Série A", home: "São Paulo", away: "Corinthians", odds: { h: 1.95, d: 3.4, a: 3.8 }, time: "Hoje 19:00" },
  { league: "La Liga", home: "Real Madrid", away: "Barcelona", odds: { h: 2.3, d: 3.5, a: 2.8 }, time: "Amanhã 17:00" },
  { league: "Premier League", home: "Liverpool", away: "Man City", odds: { h: 2.5, d: 3.3, a: 2.6 }, time: "Amanhã 13:30" },
  { league: "Champions League", home: "PSG", away: "Bayern", odds: { h: 2.4, d: 3.6, a: 2.7 }, time: "Quarta 17:00" },
  { league: "Serie A", home: "Inter", away: "Juventus", odds: { h: 2.0, d: 3.4, a: 3.6 }, time: "Sexta 15:45" },
];

function Page() {
  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">⚽ Apostas Esportivas</h1>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["Futebol", "Basquete", "Tênis", "MMA", "E-Sports", "Vôlei"].map((s) => (
            <Button key={s} variant="outline" size="sm" className="shrink-0">{s}</Button>
          ))}
        </div>
        <div className="space-y-3">
          {matches.map((m, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                <span>{m.league}</span>
                <span>{m.time}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{m.home}</p>
                  <p className="text-muted-foreground text-sm">vs</p>
                  <p className="font-semibold">{m.away}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Casa", o: m.odds.h },
                    { l: "Empate", o: m.odds.d },
                    { l: "Fora", o: m.odds.a },
                  ].map((b) => (
                    <button key={b.l} className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-primary hover:text-primary-foreground transition-colors min-w-16">
                      <div className="text-[10px] text-muted-foreground">{b.l}</div>
                      <div className="font-bold text-sm">{b.o}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
