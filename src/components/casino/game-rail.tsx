import { SectionHead } from "./section-head";
import { PFGameCard } from "./pf-game-card";
import type { PFGameLite } from "@/hooks/use-pf-launch";

interface RailProps {
  title: string;
  items: PFGameLite[];
  total?: number;
  to: string;
  ranked?: boolean;
  priority?: boolean;
  launchingCode: string | null;
  onPlay: (g: PFGameLite) => void;
}

/**
 * Category rail.
 * Mobile: snap carousel with larger art (~2.2 tiles visible).
 * Desktop: one dense row of 7/9 tiles.
 */
export function GameRail({ title, items, total, to, ranked, priority, launchingCode, onPlay }: RailProps) {
  if (items.length === 0) return null;
  const count = total ?? items.length;
  const shown = items.slice(0, 18);

  return (
    <section className="space-y-3">
      <SectionHead title={title} to={to} meta={`${count} jogo${count === 1 ? "" : "s"}`} />

      {/* mobile carousel */}
      <div className="no-scrollbar snap-row -mx-3 flex gap-2 overflow-x-auto px-3 md:hidden">
        {shown.map((g, i) => (
          <div key={`m-${g.game_code}-${i}`} className="w-[42%] min-w-[142px] shrink-0">
            <PFGameCard
              game={g}
              rank={ranked ? i + 1 : undefined}
              priority={priority && i < 3}
              loading={launchingCode === g.game_code}
              onPlay={onPlay}
            />
          </div>
        ))}
      </div>

      {/* desktop row */}
      <div className="hidden gap-2.5 md:grid md:grid-cols-7 xl:grid-cols-9">
        {shown.slice(0, 9).map((g, i) => (
          <PFGameCard
            key={`d-${g.game_code}-${i}`}
            game={g}
            rank={ranked ? i + 1 : undefined}
            priority={priority && i < 9}
            loading={launchingCode === g.game_code}
            onPlay={onPlay}
          />
        ))}
      </div>
    </section>
  );
}
