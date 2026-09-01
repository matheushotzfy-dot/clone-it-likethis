import { SectionHead } from "./section-head";
import { PFGameCard } from "./pf-game-card";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

export const GAME_GRID =
  "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-2.5 xl:grid-cols-8";

interface RailProps {
  title: string;
  items: PFGameLite[];
  total?: number;
  to: string;
  /** Number of grid rows to show (8 tiles per row on xl). */
  rows?: number;
  ranked?: boolean;
  priority?: boolean;
  launchingCode: string | null;
  onPlay: (g: PFGameLite) => void;
}

/** Category section: plain heading + dense card grid. Same grid on every breakpoint. */
export function GameRail({
  title, items, total, to, rows = 1, ranked, priority, launchingCode, onPlay,
}: RailProps) {
  if (items.length === 0) return null;
  const count = total ?? items.length;
  const shown = items.slice(0, rows * 8);

  return (
    <section className="space-y-3">
      <SectionHead title={title} to={to} meta={`${count} jogo${count === 1 ? "" : "s"}`} />
      <div className={cn(GAME_GRID)}>
        {shown.map((g, i) => (
          <PFGameCard
            key={`${title}-${g.game_code}-${i}`}
            game={g}
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
