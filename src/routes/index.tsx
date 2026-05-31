import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { GameCard } from "@/components/casino/game-card";
import { CategoryPills } from "@/components/casino/category-pills";
import { ProviderStrip } from "@/components/casino/provider-strip";
import { games } from "@/lib/games";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "SANTOSBET — Cassino e Apostas Online" }] }),
  component: Index,
});

function Section({ title, items }: { title: string; items: typeof games }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        <Link to="/cassino" className="text-xs font-bold text-primary-foreground bg-primary px-4 py-1.5 rounded-full hover:brightness-110">
          Ver mais
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {items.slice(0, 16).map((g, i) => <GameCard key={`${g.id}-${i}`} game={g} />)}
      </div>
    </section>
  );
}

function Index() {
  const slots = games.filter((g) => g.category === "slots");
  const crash = games.filter((g) => g.category === "crash");
  const live = games.filter((g) => g.category === "live");
  const top10 = [...games, ...games].slice(0, 12);

  return (
    <SiteShell>
      <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-4 space-y-6">
        <BannerCarousel />
        <CategoryPills />

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/60" />
            <input
              placeholder="Pesquise um jogo de cassino..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-popover border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary"
            />
          </div>
          <button className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110">
            <SlidersHorizontal className="size-5" />
          </button>
        </div>

        <ProviderStrip />

        {/* Top 10 */}
        <section className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 md:gap-3 overflow-hidden">
            {top10.slice(0, 8).map((g, i) => <GameCard key={`top-${g.id}-${i}`} game={g} rank={i + 1} />)}
          </div>
        </section>

        <Section title="Slots" items={slots} />
        <Section title="Cassino Ao Vivo" items={live} />
        <Section title="Crash Games" items={crash} />
      </div>
    </SiteShell>
  );
}
