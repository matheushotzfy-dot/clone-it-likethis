import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { CategoryNav } from "@/components/casino/category-nav";
import { CatalogHeader, GameGrid, LoadMore, InlineSpinner } from "@/components/casino/catalog-grid";
import { usePFGames, usePFLaunch } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: "Cassino Ao Vivo — Mesas com crupiês reais | APOSTAYA.BET" },
      { name: "description", content: "Roleta, blackjack, bacará e game shows ao vivo com crupiês reais transmitidos em alta definição." },
      { property: "og:title", content: "Cassino Ao Vivo | APOSTAYA.BET" },
      { property: "og:description", content: "Mesas ao vivo com crupiês reais em alta definição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const gamesQ = usePFGames();
  const { play, launchingCode } = usePFLaunch();

  const live = useMemo(() => {
    const list = splitPFGamesByCategory(gamesQ.data ?? []).live;
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (g) => g.name.toLowerCase().includes(term) || g.provider.name.toLowerCase().includes(term),
    );
  }, [gamesQ.data, q]);

  const visible = live.slice(0, visibleCount);
  const remaining = live.length - visible.length;

  return (
    <SiteShell>
      <div className="aurora mx-auto max-w-[1600px] space-y-4 px-2.5 py-3 md:space-y-6 md:px-6 md:py-6">
        <CatalogHeader
          title="Cassino Ao Vivo"
          subtitle={gamesQ.isLoading ? "Carregando mesas…" : `${live.length} mesas com crupiês reais`}
          q={q}
          onQ={setQ}
          placeholder="Buscar mesa ou provedor…"
        />
        <CategoryNav active="Ao Vivo" />
        <GameGrid
          games={visible}
          loading={gamesQ.isLoading}
          launchingCode={launchingCode}
          onPlay={play}
          emptyLabel="Nenhuma mesa encontrada."
        />
        {remaining > 0 && <LoadMore remaining={remaining} onClick={() => setVisibleCount((c) => c + 60)} />}
        {gamesQ.isFetching && !gamesQ.isLoading && <InlineSpinner />}
      </div>
    </SiteShell>
  );
}
