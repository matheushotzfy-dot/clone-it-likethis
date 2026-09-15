import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { CatalogHeader, ProviderFilter, GameGrid, LoadMore, InlineSpinner } from "@/components/casino/catalog-grid";
import { usePFGames, usePFProviders, usePFLaunch } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";

type CatalogSearch = { q?: string; cat?: string };

export const Route = createFileRoute("/cassino")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    ...(typeof search.q === "string" && search.q ? { q: search.q } : {}),
    ...(typeof search.cat === "string" && search.cat ? { cat: search.cat } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Cassino — Catálogo completo | apostamaxy" },
      { name: "description", content: "Explore o catálogo completo de jogos de cassino: slots, crash e mesas ao vivo, filtrados por provedor." },
      { property: "og:title", content: "Cassino — Catálogo completo | apostamaxy" },
      { property: "og:description", content: "Milhares de jogos de cassino filtrados por provedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const CATS = [
  { id: "todos", label: "Todos" },
  { id: "slots", label: "Slots" },
  { id: "crash", label: "Crash" },
  { id: "mesas", label: "Ao Vivo" },
] as const;

function Page() {
  const { q: urlQ, cat: urlCat } = Route.useSearch();
  const navigate = useNavigate({ from: "/cassino" });

  const [q, setQ] = useState(urlQ ?? "");
  const [providerId, setProviderId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(90);

  // A URL é a fonte de verdade da busca/categoria (links da sidebar e pills).
  useEffect(() => { setQ(urlQ ?? ""); }, [urlQ]);

  const cat = CATS.some((c) => c.id === urlCat) ? (urlCat as string) : "todos";

  const providersQ = usePFProviders();
  const gamesQ = usePFGames(providerId ?? undefined, {
    limit: providerId ? 600 : 1_200,
    complete: false,
    q,
  });
  const { play, launchingCode } = usePFLaunch();

  const filtered = useMemo(() => {
    const list = gamesQ.data ?? [];
    if (cat === "todos") return list;
    const split = splitPFGamesByCategory(list);
    if (cat === "slots") return split.slots;
    if (cat === "crash") return split.crash;
    return split.live;
  }, [gamesQ.data, cat]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  useEffect(() => { setVisibleCount(90); }, [providerId, q, cat]);

  const setCat = (id: string) =>
    navigate({
      search: (prev) => ({ ...prev, cat: id === "todos" ? undefined : id }),
      replace: true,
    });

  return (
    <SiteShell>
      <div className="aurora mx-auto max-w-[1600px] overflow-x-hidden space-y-4 px-2.5 py-3 md:space-y-6 md:px-6 md:py-6">
        <CatalogHeader
          title="Cassino"
          subtitle={gamesQ.isLoading ? "Carregando catálogo…" : `${filtered.length} jogos disponíveis`}
          q={q}
          onQ={setQ}
        />
        <div className="edge-fade no-scrollbar snap-row flex w-full max-w-full gap-1.5 overflow-x-auto pr-4 md:gap-2">
          {CATS.map((c) => {
            const isActive = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                data-active={isActive}
                className={
                  "chip-flat h-9 shrink-0 rounded-[10px] border border-border px-3.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] " +
                  (isActive ? "text-gold" : "text-foreground/70")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <ProviderFilter providers={providersQ.data ?? []} value={providerId} onChange={setProviderId} />
        <GameGrid
          games={visible}
          loading={gamesQ.isLoading}
          launchingCode={launchingCode}
          onPlay={play}
          emptyLabel="Nenhum jogo encontrado com esses filtros."
        />
        {remaining > 0 && <LoadMore remaining={remaining} onClick={() => setVisibleCount((c) => c + 90)} />}
        {gamesQ.isFetching && !gamesQ.isLoading && <InlineSpinner />}
      </div>
    </SiteShell>
  );
}
