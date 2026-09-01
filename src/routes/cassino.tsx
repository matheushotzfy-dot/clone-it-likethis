import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { CategoryPills } from "@/components/casino/category-pills";
import { CatalogHeader, ProviderFilter, GameGrid, LoadMore, InlineSpinner } from "@/components/casino/catalog-grid";
import { usePFGames, usePFProviders, usePFLaunch } from "@/hooks/use-pf-launch";

export const Route = createFileRoute("/cassino")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cassino — Catálogo completo | SANTOSBET" },
      { name: "description", content: "Explore o catálogo completo de jogos de cassino: slots, crash e mesas ao vivo, filtrados por provedor." },
      { property: "og:title", content: "Cassino — Catálogo completo | SANTOSBET" },
      { property: "og:description", content: "Milhares de jogos de cassino filtrados por provedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [providerId, setProviderId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(72);

  const providersQ = usePFProviders();
  const gamesQ = usePFGames(providerId ?? undefined, {
    limit: Math.max(visibleCount + 48, 120),
    q,
  });
  const { play, launchingCode } = usePFLaunch();

  const all = gamesQ.data ?? [];
  const visible = all.slice(0, visibleCount);
  const remaining = all.length - visible.length;

  useEffect(() => { setVisibleCount(72); }, [providerId, q]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-5 md:px-6 md:py-7">
        <CatalogHeader
          title="Cassino"
          subtitle={gamesQ.isLoading ? "Carregando catálogo…" : `${all.length} jogos disponíveis`}
          q={q}
          onQ={setQ}
        />
        <CategoryPills active="Todos" />
        <ProviderFilter providers={providersQ.data ?? []} value={providerId} onChange={setProviderId} />
        <GameGrid
          games={visible}
          loading={gamesQ.isLoading}
          launchingCode={launchingCode}
          onPlay={play}
          emptyLabel="Nenhum jogo encontrado com esses filtros."
        />
        {remaining > 0 && <LoadMore remaining={remaining} onClick={() => setVisibleCount((c) => c + 72)} />}
        {gamesQ.isFetching && !gamesQ.isLoading && <InlineSpinner />}
      </div>
    </SiteShell>
  );
}
