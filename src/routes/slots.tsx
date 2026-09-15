import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { CategoryNav } from "@/components/casino/category-nav";
import { CatalogHeader, ProviderFilter, GameGrid, LoadMore, InlineSpinner } from "@/components/casino/catalog-grid";
import { usePFGames, usePFProviders, usePFLaunch } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";

export const Route = createFileRoute("/slots")({
  head: () => ({
    meta: [
      { title: "Slots — Milhares de jogos | APOSTAYA.BET" },
      { name: "description", content: "Slots dos melhores provedores: PG Soft, Pragmatic, Hacksaw e mais. Gire com PIX instantâneo." },
      { property: "og:title", content: "Slots — Milhares de jogos | APOSTAYA.BET" },
      { property: "og:description", content: "Slots dos melhores provedores com PIX instantâneo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SlotsPage,
});

function SlotsPage() {
  const [q, setQ] = useState("");
  const [providerId, setProviderId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);

  const providersQ = usePFProviders();
  const gamesQ = usePFGames(providerId ?? undefined, {
    limit: providerId ? 600 : 1_200,
    complete: false,
    q,
  });
  const { play, launchingCode } = usePFLaunch();

  const slots = useMemo(
    () => splitPFGamesByCategory(gamesQ.data ?? []).slots,
    [gamesQ.data],
  );
  const visible = slots.slice(0, visibleCount);
  const remaining = slots.length - visible.length;

  useEffect(() => { setVisibleCount(60); }, [providerId, q]);

  return (
    <SiteShell>
      <div className="aurora mx-auto max-w-[1600px] overflow-x-hidden space-y-4 px-2.5 py-3 md:space-y-6 md:px-6 md:py-6">
        <CatalogHeader
          title="Slots"
          subtitle={gamesQ.isLoading ? "Carregando catálogo…" : `${slots.length} slots disponíveis`}
          q={q}
          onQ={setQ}
        />
        <CategoryNav active="Slots" />
        <ProviderFilter providers={providersQ.data ?? []} value={providerId} onChange={setProviderId} />
        <GameGrid
          games={visible}
          loading={gamesQ.isLoading}
          launchingCode={launchingCode}
          onPlay={play}
          emptyLabel="Nenhum slot encontrado com esses filtros."
        />
        {remaining > 0 && <LoadMore remaining={remaining} onClick={() => setVisibleCount((c) => c + 60)} />}
        {gamesQ.isFetching && !gamesQ.isLoading && <InlineSpinner />}
      </div>
    </SiteShell>
  );
}
