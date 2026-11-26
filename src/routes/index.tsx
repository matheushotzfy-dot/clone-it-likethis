import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { HubTiles } from "@/components/casino/hub-tiles";
import { PromoBanners } from "@/components/casino/promo-banners";
import { CategoryNav } from "@/components/casino/category-nav";
import { GameRail, TopTenRail } from "@/components/casino/game-section";
import { ProviderStrip } from "@/components/casino/provider-strip";
import { LiveStrip } from "@/components/sports/live-strip";
import { useLobby, usePlay, useTopGames } from "@/hooks/use-games";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta(
      "apostamaxy: cassino e apostas esportivas",
      "Slots, crash, cassino ao vivo e apostas esportivas, com depósito e saque por Pix.",
    ),
  }),
  component: Home,
});

function Home() {
  const play = usePlay();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const top = useTopGames();
  const slots = useLobby({ category: "slot" }, 9);
  const crash = useLobby({ category: "crash" }, 9);
  const live = useLobby({ category: "live" }, 9);

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-7 px-3 py-4 md:space-y-9 md:px-6 md:py-6">
        <PromoBanners />
        <HubTiles />

        <div className="space-y-3">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (term.trim()) navigate({ to: "/cassino", search: { q: term.trim() } });
            }}
            className="relative xl:hidden"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar jogo ou provedor"
              aria-label="Buscar jogo ou provedor"
              enterKeyHint="search"
              className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-3 outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </form>
          <CategoryNav active="inicio" />
        </div>

        <TopTenRail
          title={top.data?.byPlays ? "Mais jogados da semana" : "Os favoritos do Brasil"}
          games={top.data?.games ?? []}
          loading={top.isLoading}
          onPlay={play}
        />

        <LiveStrip />

        <GameRail
          title="Slots"
          games={slots.data?.games ?? []}
          count={slots.data?.total}
          loading={slots.isLoading}
          to="/slots"
          onPlay={play}
          priority
        />
        <GameRail
          title="Crash"
          games={crash.data?.games ?? []}
          count={crash.data?.total}
          loading={crash.isLoading}
          to="/cassino"
          search={{ cat: "crash" }}
          onPlay={play}
        />
        <GameRail
          title="Cassino ao vivo"
          games={live.data?.games ?? []}
          count={live.data?.total}
          loading={live.isLoading}
          to="/ao-vivo"
          onPlay={play}
        />

        <ProviderStrip />
      </div>
    </SiteShell>
  );
}
