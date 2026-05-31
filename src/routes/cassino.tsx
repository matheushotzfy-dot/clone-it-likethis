import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { GameCard } from "@/components/casino/game-card";
import { games, providers } from "@/lib/games";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cassino")({
  head: () => ({ meta: [{ title: "Cassino — SANTOSBET" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const [prov, setProv] = useState<string | null>(null);

  const filtered = games.filter(
    (g) =>
      g.name.toLowerCase().includes(q.toLowerCase()) &&
      (!prov || g.provider === prov)
  );

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Cassino</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jogo..." className="pl-10 h-11 bg-surface" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!prov ? "default" : "outline"}
            size="sm"
            onClick={() => setProv(null)}
          >Todos</Button>
          {providers.map((p) => (
            <Button
              key={p}
              variant={prov === p ? "default" : "outline"}
              size="sm"
              onClick={() => setProv(p)}
            >{p}</Button>
          ))}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.map((g, i) => <GameCard key={g.id} game={g} priority={i < 12} />)}
        </div>
      </div>
    </SiteShell>
  );
}
