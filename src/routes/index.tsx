import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { CategoryPills } from "@/components/casino/category-pills";
import { ProviderStrip } from "@/components/casino/provider-strip";
import { usePFGames, usePFLaunch, type PFGameLite } from "@/hooks/use-pf-launch";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "SANTOSBET — Cassino e Apostas Online" }] }),
  component: Index,
});

function Section({ title, items, play, launchingCode }: { title: string; items: PFGameLite[]; play: (g: PFGameLite) => void; launchingCode: string | null }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        <Link to="/cassino" className="text-xs font-bold text-primary-foreground bg-primary px-4 py-1.5 rounded-full hover:brightness-110">
          Ver mais
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {items.slice(0, 16).map((g, i) => (
          <PFGameCard key={`${g.provider.name}-${g.game_code}-${i}`} game={g} priority={i < 8} loading={launchingCode === g.game_code} onPlay={play} />
        ))}
      </div>
    </section>
  );
}

const LIVE_HINTS = ["LIVE", "EVOLUTION", "PRAGMATIC LIVE", "EZUGI", "ROULETTE", "BACCARAT", "BLACKJACK", "DEALER", "CRAZY"];
const CRASH_HINTS = ["AVIATOR", "CRASH", "JETX", "SPACEMAN", "MINES", "PLINKO", "DICE", "LIMBO"];

function Index() {
  const [q, setQ] = useState("");
  const gamesQ = usePFGames();
  const { play, launchingCode } = usePFLaunch();

  const all = gamesQ.data ?? [];
  const { live, crash, slots, top } = useMemo(() => {
    const live: PFGameLite[] = [];
    const crash: PFGameLite[] = [];
    const slots: PFGameLite[] = [];
    for (const g of all) {
      const txt = `${g.provider.name} ${g.name}`.toUpperCase();
      if (CRASH_HINTS.some((h) => txt.includes(h))) crash.push(g);
      else if (LIVE_HINTS.some((h) => txt.includes(h))) live.push(g);
      else slots.push(g);
    }
    return { live, crash, slots, top: all.slice(0, 8) };
  }, [all]);

  const filtered = q.trim()
    ? all.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()) || g.provider.name.toLowerCase().includes(q.toLowerCase()))
    : null;

  return (
    <SiteShell>
      <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-4 space-y-6">
        <BannerCarousel />
        <CategoryPills />

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquise um jogo de cassino..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-popover border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary"
            />
          </div>
          <button className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110">
            <SlidersHorizontal className="size-5" />
          </button>
        </div>

        <ProviderStrip />

        {gamesQ.isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : filtered ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filtered.map((g, i) => (
              <PFGameCard key={`${g.provider.name}-${g.game_code}-${i}`} game={g} priority={i < 8} loading={launchingCode === g.game_code} onPlay={play} />
            ))}
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 md:gap-3 overflow-hidden">
                {top.map((g, i) => (
                  <PFGameCard key={`top-${g.game_code}-${i}`} game={g} rank={i + 1} priority loading={launchingCode === g.game_code} onPlay={play} />
                ))}
              </div>
            </section>

            <Section title="Slots" items={slots} play={play} launchingCode={launchingCode} />
            <Section title="Cassino Ao Vivo" items={live} play={play} launchingCode={launchingCode} />
            <Section title="Crash Games" items={crash} play={play} launchingCode={launchingCode} />
          </>
        )}
      </div>
    </SiteShell>
  );
}
