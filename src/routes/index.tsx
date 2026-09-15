import { createFileRoute } from "@tanstack/react-router";
import { Search, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { CategoryNav } from "@/components/casino/category-nav";
import { ProviderStrip } from "@/components/casino/provider-strip";
import { GameRail, GAME_GRID } from "@/components/casino/game-rail";
import { usePFGames, usePFLaunch, type PFGameLite } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "APOSTAYA.BET — Cassino Online com Slots e Mesas Ao Vivo" },
      {
        name: "description",
        content:
          "Jogue slots, crash games e mesas ao vivo dos maiores provedores. Depósito e saque por PIX em segundos.",
      },
      { property: "og:title", content: "APOSTAYA.BET — Cassino Online" },
      { property: "og:description", content: "Slots, crash games e cassino ao vivo com PIX instantâneo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const gamesQ = usePFGames(undefined, { limit: 10_000 });
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
    const top = dedupe([...slots, ...crash, ...live]).slice(0, 16);

    /** Rails shouldn't repeat what the "most played" block already shows. */
    const inTop = new Set(top.map((g) => g.game_code));
    const rest = (list: PFGameLite[]) => {
      const fresh = list.filter((g) => !inTop.has(g.game_code));
      return fresh.length >= 8 ? fresh : list;
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
      <div className="aurora mx-auto max-w-[1600px] space-y-4 px-2.5 py-2.5 md:space-y-7 md:px-6 md:py-5">
        <BannerCarousel aspectClass="aspect-[16/8] sm:aspect-[2.4/1] md:aspect-[1920/560]" />

        {/* nav + search on one line */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-6">
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
          <div className={GAME_GRID}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-[10px]" />
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
              <p className="rounded-[10px] border border-border p-6 text-sm text-muted-foreground">
                Nenhum jogo encontrado. Tente outro termo.
              </p>
            ) : (
              <div className={GAME_GRID}>
                {filtered.slice(0, 48).map((g, i) => (
                  <PFGameCard
                    key={`s-${g.game_code}-${i}`}
                    game={g}
                    priority={i < 8}
                    loading={launchingCode === g.game_code}
                    onPlay={play}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <GameRail
              title="Mais jogados"
              items={top}
              to="/cassino"
              rows={2}
              accent="cat-hot"
              ranked
              priority
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail
              title="Crash games"
              items={crash}
              to="/cassino"
              accent="cat-crash"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail
              title="Cassino ao vivo"
              items={live}
              to="/ao-vivo"
              accent="cat-live"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail title="Slots" items={slots} to="/slots" rows={2} accent="cat-slots" launchingCode={launchingCode} onPlay={play} />
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
