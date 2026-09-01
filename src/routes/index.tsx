import { createFileRoute } from "@tanstack/react-router";
import { Search, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { CategoryNav } from "@/components/casino/category-nav";
import { SectionHead } from "@/components/casino/section-head";
import { TopList } from "@/components/casino/top-list";
import { ProviderStrip } from "@/components/casino/provider-strip";
import { GameRail } from "@/components/casino/game-rail";
import { usePFGames, usePFLaunch, type PFGameLite } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SANTOSBET — Cassino Online com Slots e Mesas Ao Vivo" },
      {
        name: "description",
        content:
          "Jogue slots, crash games e mesas ao vivo dos maiores provedores. Depósito e saque por PIX em segundos.",
      },
      { property: "og:title", content: "SANTOSBET — Cassino Online" },
      { property: "og:description", content: "Slots, crash games e cassino ao vivo com PIX instantâneo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7 xl:grid-cols-9 md:gap-2.5";

function Index() {
  const [q, setQ] = useState("");
  const gamesQ = usePFGames();
  const { play, launchingCode } = usePFLaunch();

  const all = gamesQ.data ?? [];
  const { live, crash, slots, top } = useMemo(() => {
    const grouped = splitPFGamesByCategory(all);

    /** Same title can be exposed by several provider aliases — keep the first. */
    const dedupe = (list: PFGameLite[]) => {
      const seen = new Set<string>();
      return list.filter((g) => {
        const key = g.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const slots = dedupe(grouped.slots);
    const crash = dedupe(grouped.crash);
    const live = dedupe(grouped.live);
    const top = dedupe([...slots, ...crash, ...live]).slice(0, 18);

    /** Rails shouldn't repeat what the "most played" block already shows. */
    const inTop = new Set(top.map((g) => g.game_code));
    const rest = (list: PFGameLite[]) => {
      const fresh = list.filter((g) => !inTop.has(g.game_code));
      return fresh.length >= 9 ? fresh : list;
    };

    return { slots: rest(slots), crash: rest(crash), live: rest(live), top };
  }, [all]);

  const term = q.trim().toLowerCase();
  const filtered = term
    ? all.filter(
        (g) => g.name.toLowerCase().includes(term) || g.provider.name.toLowerCase().includes(term),
      )
    : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-4 md:space-y-9 md:px-6 md:py-6">
        {/* asymmetric top: banner 60 / ranking 40 */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5">
          <BannerCarousel aspectClass="aspect-[16/9] sm:aspect-[2.4/1] lg:aspect-[1.92/1]" />

          <aside className="space-y-2.5">
            <div className="flex items-end justify-between border-b border-border pb-2">
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em]">
                Top 5 do momento
              </h2>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Agora
              </span>
            </div>
            {gamesQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-[52px] rounded-[6px]" />
                ))}
              </div>
            ) : (
              <TopList items={top.slice(0, 5)} launchingCode={launchingCode} onPlay={play} />
            )}
          </aside>
        </div>

        {/* text nav + inline search on one line */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
          <div className="min-w-0 flex-1">
            <CategoryNav active="Populares" />
          </div>
          <div className="relative w-full lg:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar jogo ou provedor"
              aria-label="Buscar jogo"
              className="h-10 w-full rounded-[8px] border border-border bg-surface/50 pl-9 pr-9 text-[13px] font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:border-gold focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[6px] text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {gamesQ.isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-[8px]" />
            ))}
          </div>
        ) : filtered ? (
          <section className="space-y-3">
            <div className="flex items-end justify-between border-b border-border pb-2">
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em]">
                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
              </h2>
              <span className="truncate text-[11px] text-muted-foreground">“{q.trim()}”</span>
            </div>
            {filtered.length === 0 ? (
              <p className="border border-border p-6 text-sm text-muted-foreground">
                Nenhum jogo encontrado. Tente outro termo.
              </p>
            ) : (
              <div className={GRID}>
                {filtered.slice(0, 54).map((g, i) => (
                  <PFGameCard
                    key={`s-${g.game_code}-${i}`}
                    game={g}
                    priority={i < 9}
                    loading={launchingCode === g.game_code}
                    onPlay={play}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="space-y-3">
              <SectionHead title="Mais jogados" to="/cassino" meta={`${top.length} jogos`} />
              <div className={GRID}>
                {top.slice(0, 18).map((g, i) => (
                  <PFGameCard
                    key={`h-${g.game_code}-${i}`}
                    game={g}
                    priority={i < 9}
                    loading={launchingCode === g.game_code}
                    onPlay={play}
                  />
                ))}
              </div>
            </section>

            <GameRail
              title="Crash games"
              items={crash}
              to="/cassino"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail
              title="Cassino ao vivo"
              items={live}
              to="/ao-vivo"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail title="Slots" items={slots} to="/slots" launchingCode={launchingCode} onPlay={play} />
            <ProviderStrip />
          </>
        )}

        {gamesQ.isFetching && !gamesQ.isLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-gold" />
          </div>
        )}
      </div>
    </SiteShell>
  );
}
