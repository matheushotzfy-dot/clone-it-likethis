import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { usePFGames, usePFLaunch } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({ meta: [{ title: "Ao Vivo — SANTOSBET" }] }),
  component: Page,
});

function Page() {
  const gamesQ = usePFGames();
  const { play, launchingCode } = usePFLaunch();

  const live = useMemo(() => {
    const list = gamesQ.data ?? [];
    return splitPFGamesByCategory(list).live;
  }, [gamesQ.data]);

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cassino Ao Vivo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {gamesQ.isLoading ? "Carregando..." : `${live.length} mesas com crupiês reais`}
          </p>
        </div>
        {gamesQ.isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {live.map((g, i) => (
              <PFGameCard key={`${g.provider.name}-${g.game_code}`} game={g} priority={i < 12} loading={launchingCode === g.game_code} onPlay={play} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
