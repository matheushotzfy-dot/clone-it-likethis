import { createFileRoute } from "@tanstack/react-router";
import { Search, Flame, Rocket, MonitorPlay, Gamepad2, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { CategoryPills } from "@/components/casino/category-pills";
import { ProviderStrip } from "@/components/casino/provider-strip";
import { TrustBar } from "@/components/casino/trust-bar";
import { GameRail } from "@/components/casino/game-rail";
import { usePFGames, usePFLaunch, type PFGameLite } from "@/hooks/use-pf-launch";
import { splitPFGamesByCategory } from "@/lib/pf-game-classification";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SANTOSBET — Cassino Online com Slots e Mesas Ao Vivo" },
      { name: "description", content: "Jogue slots, crash games e mesas ao vivo dos maiores provedores. Depósito e saque por PIX em segundos." },
      { property: "og:title", content: "SANTOSBET — Cassino Online" },
      { property: "og:description", content: "Slots, crash games e cassino ao vivo com PIX instantâneo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const GRID = "grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 md:gap-3 xl:grid-cols-8";

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

    return { slots, crash, live, top };
  }, [all]);

  const term = q.trim().toLowerCase();
  const filtered = term
    ? all.filter(
        (g) => g.name.toLowerCase().includes(term) || g.provider.name.toLowerCase().includes(term),
      )
    : null;

  return (
    <SiteShell>
      <div className="app-glow mx-auto max-w-[1600px] space-y-6 px-3 py-4 md:space-y-8 md:px-6 md:py-6">
        <BannerCarousel />

        <TrustBar />

        <CategoryPills active="Populares" />

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar jogo ou provedor…"
            aria-label="Buscar jogo"
            className="surface-grad h-11 w-full rounded-xl border border-border pl-11 pr-11 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" strokeWidth={2.25} />
            </button>
          )}
        </div>

        {gamesQ.isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : filtered ? (
          <section className="space-y-3">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"} para “{q.trim()}”
            </h2>
            {filtered.length === 0 ? (
              <p className="panel surface-grad p-6 text-sm text-muted-foreground">
                Nenhum jogo encontrado. Tente outro termo.
              </p>
            ) : (
              <div className={GRID}>
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
              title="Mais jogados agora"
              Icon={Flame}
              accent="hot"
              badge="Em alta"
              items={top}
              ranked
              priority
              to="/cassino"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail
              title="Crash Games"
              Icon={Rocket}
              accent="crash"
              items={crash}
              to="/cassino"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail
              title="Cassino Ao Vivo"
              Icon={MonitorPlay}
              accent="live"
              badge="Crupiê real"
              items={live}
              to="/ao-vivo"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <GameRail
              title="Slots"
              Icon={Gamepad2}
              accent="slots"
              items={slots}
              to="/slots"
              launchingCode={launchingCode}
              onPlay={play}
            />
            <ProviderStrip />
          </>
        )}

        {gamesQ.isFetching && !gamesQ.isLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
        )}
      </div>
    </SiteShell>
  );
}
