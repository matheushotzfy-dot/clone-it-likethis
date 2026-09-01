import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Flame, Rocket, MonitorPlay, Gamepad2, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { BannerCarousel } from "@/components/casino/banner-carousel";
import { PFGameCard } from "@/components/casino/pf-game-card";
import { CategoryPills } from "@/components/casino/category-pills";
import { ProviderStrip } from "@/components/casino/provider-strip";
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

function Rail({
  title, Icon, items, play, launchingCode, to, ranked,
}: {
  title: string;
  Icon: typeof Flame;
  items: PFGameLite[];
  play: (g: PFGameLite) => void;
  launchingCode: string | null;
  to: string;
  ranked?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Icon className="size-4 shrink-0 text-primary" strokeWidth={2} />
          <span className="truncate">{title}</span>
        </h2>
        <Link
          to={to}
          className="slick flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/70 hover:border-primary hover:text-primary"
        >
          Ver mais <ChevronRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
      <div className={GRID}>
        {items.slice(0, 16).map((g, i) => (
          <PFGameCard
            key={`${title}-${g.game_code}-${i}`}
            game={g}
            rank={ranked ? i + 1 : undefined}
            priority={i < 8}
            loading={launchingCode === g.game_code}
            onPlay={play}
          />
        ))}
      </div>
    </section>
  );
}

function Index() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const gamesQ = usePFGames();
  const { play, launchingCode } = usePFLaunch();

  const all = gamesQ.data ?? [];
  const { live, crash, slots, top } = useMemo(() => {
    const grouped = splitPFGamesByCategory(all);
    return { ...grouped, top: [...grouped.slots, ...grouped.crash, ...grouped.live].slice(0, 8) };
  }, [all]);

  const filtered = q.trim()
    ? all.filter(
        (g) =>
          g.name.toLowerCase().includes(q.toLowerCase()) ||
          g.provider.name.toLowerCase().includes(q.toLowerCase()),
      )
    : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-7 px-3 py-4 md:px-6 md:py-6">
        <BannerCarousel />

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <form
            onSubmit={(e) => { e.preventDefault(); }}
            className="relative flex-1"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por jogo ou provedor…"
              aria-label="Buscar jogo"
              className="h-12 w-full rounded-md border border-border bg-surface/60 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </form>
          <button
            onClick={() => navigate({ to: "/cassino" })}
            className="slick h-12 rounded-md border border-border px-5 text-[13px] font-bold uppercase tracking-wide text-foreground/75 hover:border-primary hover:text-primary"
          >
            Catálogo completo
          </button>
        </div>

        <CategoryPills active="Populares" />

        {gamesQ.isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-[10px]" />
            ))}
          </div>
        ) : filtered ? (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"} para “{q.trim()}”
            </h2>
            {filtered.length === 0 ? (
              <p className="panel p-6 text-sm text-muted-foreground">
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
            <Rail title="Mais jogados agora" Icon={Flame} items={top} play={play} launchingCode={launchingCode} to="/cassino" ranked />
            <Rail title="Crash Games" Icon={Rocket} items={crash} play={play} launchingCode={launchingCode} to="/cassino" />
            <Rail title="Cassino Ao Vivo" Icon={MonitorPlay} items={live} play={play} launchingCode={launchingCode} to="/ao-vivo" />
            <Rail title="Slots" Icon={Gamepad2} items={slots} play={play} launchingCode={launchingCode} to="/slots" />
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
