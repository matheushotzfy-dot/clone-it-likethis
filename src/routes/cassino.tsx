import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { CategoryPills } from "@/components/casino/category-pills";
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
    limit: Math.max(visibleCount + 90, 180),
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

  const activePill = cat === "crash" ? "Crash" : cat === "mesas" ? "Mesas" : cat === "slots" ? "Slots" : "Todos";

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-5 md:px-6 md:py-7">
        <CatalogHeader
          title="Cassino"
          subtitle={gamesQ.isLoading ? "Carregando catálogo…" : `${filtered.length} jogos disponíveis`}
          q={q}
          onQ={setQ}
        />
        <CategoryPills active={activePill} />

        <div className="no-scrollbar snap-row -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
          {CATS.map((c) => {
            const isActive = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={
                  "slick h-9 shrink-0 rounded-md border px-4 text-[13px] font-semibold " +
                  (isActive
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-surface/60 text-foreground/70 hover:border-gold/60 hover:text-foreground")
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
