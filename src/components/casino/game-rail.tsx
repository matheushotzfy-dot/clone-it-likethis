import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { PFGameCard, type CardAccent } from "./pf-game-card";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

const accentClass: Record<CardAccent, string> = {
  hot: "cat-hot",
  crash: "cat-crash",
  live: "cat-live",
  slots: "cat-slots",
  neutral: "cat-neutral",
};

interface RailProps {
  title: string;
  Icon: LucideIcon;
  accent: CardAccent;
  items: PFGameLite[];
  total?: number;
  to: string;
  ranked?: boolean;
  badge?: string;
  priority?: boolean;
  launchingCode: string | null;
  onPlay: (g: PFGameLite) => void;
}

/**
 * One category rail.
 * Mobile: single-row snap carousel (more games visible, natural thumb scroll).
 * Desktop: one dense grid row.
 */
export function GameRail({
  title, Icon, accent, items, total, to, ranked, badge, priority, launchingCode, onPlay,
}: RailProps) {
  if (items.length === 0) return null;
  const count = total ?? items.length;
  const shown = items.slice(0, 18);

  return (
    <section className={cn("space-y-3", accentClass[accent])}>
      <div className="flex items-center gap-3">
        <span className="bg-cat-soft border-cat grid size-9 shrink-0 place-items-center rounded-xl border">
          <Icon className="text-cat size-[18px]" strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display truncate text-[15px] font-extrabold uppercase tracking-tight md:text-base">
              {title}
            </h2>
            {badge && (
              <span className="badge-chip bg-cat-soft text-cat border-cat border">{badge}</span>
            )}
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {count} jogo{count === 1 ? "" : "s"}
          </p>
        </div>

        <Link
          to={to}
          className="slick tap-44 flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface/60 px-3 text-[11px] font-bold uppercase tracking-wide text-foreground/75 hover:border-cat hover:text-cat"
        >
          Ver mais <ChevronRight className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="rail-line h-px w-full" />

      {/* mobile: carousel */}
      <div className="no-scrollbar snap-row -mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 md:hidden">
        {shown.map((g, i) => (
          <div key={`m-${g.game_code}-${i}`} className="w-[31%] min-w-[112px] shrink-0">
            <PFGameCard
              game={g}
              accent={accent}
              rank={ranked ? i + 1 : undefined}
              priority={priority && i < 4}
              loading={launchingCode === g.game_code}
              onPlay={onPlay}
            />
          </div>
        ))}
      </div>

      {/* desktop: grid row */}
      <div className="hidden gap-3 md:grid md:grid-cols-6 xl:grid-cols-8">
        {shown.slice(0, 8).map((g, i) => (
          <PFGameCard
            key={`d-${g.game_code}-${i}`}
            game={g}
            accent={accent}
            rank={ranked ? i + 1 : undefined}
            priority={priority && i < 8}
            loading={launchingCode === g.game_code}
            onPlay={onPlay}
          />
        ))}
      </div>
    </section>
  );
}
