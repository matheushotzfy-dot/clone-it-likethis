import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { GameCard } from "@/components/casino/game-card";
import { games } from "@/lib/games";
import { useRequireAccess } from "@/hooks/use-game-access";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({ meta: [{ title: "Ao Vivo — SANTOSBET" }] }),
  component: Page,
});

function Page() {
  const { allowed, loading } = useRequireAccess();
  if (loading || !allowed) {
    return (
      <SiteShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </SiteShell>
    );
  }
  const live = games.filter((g) => g.category === "live");
  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cassino Ao Vivo</h1>
          <p className="text-muted-foreground text-sm mt-1">{live.length} mesas com crupiês reais em tempo real</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {live.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </div>
    </SiteShell>
  );
}
