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
import { useLobby, usePlay, useTopGames, type LobbyFilter } from "@/hooks/use-games";
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

/** Uma seção do lobby: filtro, título e para onde o "Ver todos" leva. */
function LobbyRail({
  title,
  filter,
  to,
  search,
  priority,
}: {
  title: string;
  filter: LobbyFilter;
  to: string;
  search?: Record<string, string>;
  priority?: boolean;
}) {
  const play = usePlay();
  const q = useLobby(filter, 18);
  return (
    <GameRail
      title={title}
      games={q.data?.games ?? []}
      count={q.data?.total}
      loading={q.isLoading}
      to={to}
      search={search}
      onPlay={play}
      priority={priority}
    />
  );
}

function Home() {
  const play = usePlay();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const top = useTopGames();

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-3 sm:space-y-7 sm:py-4 md:space-y-10 md:px-6 md:py-6">
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
          note={top.data?.byPlays ? "Pelo número de jogadores nos últimos 7 dias" : undefined}
          games={top.data?.games ?? []}
          loading={top.isLoading}
          onPlay={play}
        />

        <LobbyRail
          title="PG Soft"
          filter={{ provider: "PG Soft", category: "slot" }}
          to="/cassino"
          search={{ provedor: "PG Soft" }}
          priority
        />
        <LobbyRail
          title="Crash e jogos rápidos"
          filter={{ category: "crash" }}
          to="/cassino"
          search={{ cat: "crash" }}
        />

        <LiveStrip />

        <LobbyRail
          title="Roletas ao vivo"
          filter={{ category: "live", kind: "roulette" }}
          to="/ao-vivo"
          search={{ tipo: "roulette" }}
        />
        <LobbyRail
          title="Pragmatic Play"
          filter={{ provider: "Pragmatic Play" }}
          to="/cassino"
          search={{ provedor: "Pragmatic Play" }}
        />
        <LobbyRail
          title="Game shows"
          filter={{ category: "live", kind: "gameshow" }}
          to="/ao-vivo"
          search={{ tipo: "gameshow" }}
        />
        <LobbyRail
          title="Baccarat e Bac Bo"
          filter={{ category: "live", kind: "baccarat" }}
          to="/ao-vivo"
          search={{ tipo: "baccarat" }}
        />
        <LobbyRail
          title="Slots de A a Z"
          filter={{ category: "slot", sort: "az" }}
          to="/slots"
          search={{ ordem: "az" }}
        />

        <ProviderStrip />
      </div>
    </SiteShell>
  );
}
