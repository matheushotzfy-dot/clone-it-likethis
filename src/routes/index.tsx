import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { GameCard } from "@/components/casino/game-card";
import { games, providers, categories } from "@/lib/games";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "PIXBET — Cassino e Apostas Online" }] }),
  component: Index,
});

function Section({ title, items }: { title: string; items: typeof games }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <Button asChild variant="link" className="text-primary">
          <Link to="/cassino">Ver mais</Link>
        </Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {items.slice(0, 7).map((g) => <GameCard key={g.id} game={g} />)}
      </div>
    </section>
  );
}

function Index() {
  const slots = games.filter((g) => g.category === "slots");
  const crash = games.filter((g) => g.category === "crash");
  const live = games.filter((g) => g.category === "live");

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 space-y-6">
        <BannerCarousel />

        {/* Quick categories */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {categories.map((c) => (
            <button key={c.id} className="flex flex-col items-center gap-2 group">
              <div className="size-12 md:size-14 rounded-full bg-primary/20 border-2 border-primary text-primary text-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                {c.icon}
              </div>
              <span className="text-xs font-medium text-center">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Pesquise um jogo de cassino..." className="pl-10 h-11 bg-surface border-border" />
          </div>
          <Button variant="default" size="icon" className="h-11 w-11">
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>

        {/* Providers strip */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {providers.map((p) => (
            <div key={p} className="shrink-0 px-5 py-3 rounded-xl bg-surface border border-border text-sm font-bold whitespace-nowrap text-foreground/70 hover:text-primary hover:border-primary transition-colors cursor-pointer">
              {p}
            </div>
          ))}
        </div>

        {/* Top 10 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">🔥 Top 10 da Semana</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pl-4">
            {games.slice(0, 6).map((g, i) => (
              <GameCard key={g.id} game={g} rank={i + 1} />
            ))}
          </div>
        </section>

        <Section title="🎰 Slots" items={slots} />
        <Section title="🚀 Crash Games" items={crash} />
        <Section title="🎯 Cassino Ao Vivo" items={live} />
      </div>
    </SiteShell>
  );
}
