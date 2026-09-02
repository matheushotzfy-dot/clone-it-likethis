import { SectionHead } from "./section-head";
import { PFGameCard } from "./pf-game-card";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

export const GAME_GRID =
  "grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-6 md:gap-2.5 xl:grid-cols-8";

interface RailProps {
  title: string;
  items: PFGameLite[];
  total?: number;
  to: string;
  /** Number of grid rows to show (8 tiles per row on xl). */
  rows?: number;
  ranked?: boolean;
  priority?: boolean;
  /** Accent class: cat-hot | cat-crash | cat-live | cat-slots | cat-neutral */
  accent?: string;
  launchingCode: string | null;
  onPlay: (g: PFGameLite) => void;
}

/** Category section: accented heading + dense card grid. */
export function GameRail({
  title, items, total, to, rows = 1, ranked, priority, accent = "cat-neutral", launchingCode, onPlay,
}: RailProps) {
  if (items.length === 0) return null;
  const count = total ?? items.length;
  const shown = items.slice(0, rows * 8);

  return (
    <section className={cn(accent, "space-y-2.5 md:space-y-3")}>
      <SectionHead title={title} to={to} meta={`${count} jogo${count === 1 ? "" : "s"}`} />
      <div className={cn(GAME_GRID)}>
        {shown.map((g, i) => (
          <div
            key={`${title}-${g.game_code}-${i}`}
            className="pop-in"
            style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
          >
            <PFGameCard
              game={g}
              rank={ranked ? i + 1 : undefined}
              priority={priority && i < 8}
              loading={launchingCode === g.game_code}
              onPlay={onPlay}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
