import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { usePFGames, usePFProviders, usePFLaunch } from "@/hooks/use-pf-launch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/cassino")({
  head: () => ({ meta: [{ title: "Cassino — SANTOSBET" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const [providerId, setProviderId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(72);
  const providersQ = usePFProviders();
  const gamesQ = usePFGames(providerId ?? undefined, { limit: Math.max(visibleCount + 48, 120), q });
  const { play, launchingCode } = usePFLaunch();

  const filtered = useMemo(() => {
    return gamesQ.data ?? [];
  }, [gamesQ.data]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  useEffect(() => { setVisibleCount(72); }, [providerId, q]);

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cassino</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {gamesQ.isLoading ? "Carregando..." : `${filtered.length} jogos disponíveis`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jogo ou provedor..." className="pl-10 h-11 bg-surface" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Button variant={providerId === null ? "default" : "outline"} size="sm" onClick={() => setProviderId(null)} className="shrink-0">Todos</Button>
          {(providersQ.data ?? []).map((p) => (
            <Button key={p.id} variant={providerId === p.id ? "default" : "outline"} size="sm" onClick={() => setProviderId(p.id)} className="shrink-0">{p.name}</Button>
          ))}
        </div>
        {gamesQ.isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {visible.map((g, i) => (
              <PFGameCard key={`${g.provider.name}-${g.game_code}`} game={g} priority={i < 12} loading={launchingCode === g.game_code} onPlay={play} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => setVisibleCount((c) => c + 72)} variant="outline" size="lg" className="min-w-[200px]">
                Carregar mais
              </Button>
            </div>
          )}
        )}
      </div>
    </SiteShell>
  );
}
