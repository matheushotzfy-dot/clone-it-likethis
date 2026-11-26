import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { GameTile, GameTileSkeleton } from "./game-tile";
import type { LobbyGame } from "@/hooks/use-games";
import { cn } from "@/lib/utils";

/** Grid denso: 3 capas por linha no celular, até 9 em tela larga. */
export const GAME_GRID =
  "grid grid-cols-3 gap-x-2.5 gap-y-3.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9";

/** Quantas capas cabem numa linha em cada largura: 5 (md), 6 (lg), 7 (xl), 9 (2xl). */
function railVisibility(i: number) {
  if (i <= 4) return "";
  if (i === 5) return "md:hidden lg:block";
  if (i === 6) return "md:hidden xl:block";
  return "md:hidden 2xl:block";
}

/** Trilho de uma linha que rola no celular e vira grid no desktop. */
const RAIL =
  "no-scrollbar -mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9";

export function SectionHeading({
  title,
  count,
  to,
  search,
  extra,
}: {
  title: string;
  count?: number;
  to?: string;
  search?: Record<string, string>;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <h2 className="text-[22px] md:text-[26px]">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="num text-[13px] text-muted-foreground">
          {count.toLocaleString("pt-BR")} jogos
        </span>
      )}
      {extra}
      {to && (
        <Link
          to={to}
          search={search as never}
          className="ml-auto shrink-0 text-[13px] font-semibold text-primary hover:underline"
        >
          Ver todos
        </Link>
      )}
    </div>
  );
}

export function GameRail({
  title,
  games,
  loading,
  count,
  to,
  search,
  onPlay,
  priority,
}: {
  title: string;
  games: LobbyGame[];
  loading?: boolean;
  count?: number;
  to?: string;
  search?: Record<string, string>;
  onPlay: (g: LobbyGame) => void;
  priority?: boolean;
}) {
  if (!loading && games.length === 0) return null;
  return (
    <section>
      <SectionHeading title={title} count={count} to={to} search={search} />
      <div className={RAIL}>
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={cn("w-[31%] shrink-0 snap-start md:w-auto", railVisibility(i))}
              >
                <GameTileSkeleton />
              </div>
            ))
          : games.slice(0, 9).map((g, i) => (
              <div
                key={g.id}
                className={cn(
                  "w-[31%] shrink-0 snap-start empty:hidden md:w-auto",
                  railVisibility(i),
                )}
              >
                <GameTile game={g} onPlay={onPlay} priority={priority && i < 6} />
              </div>
            ))}
      </div>
    </section>
  );
}

/** Top 10 com numeral dourado atrás de cada capa. */
export function TopTenRail({
  title,
  games,
  loading,
  onPlay,
}: {
  title: string;
  games: LobbyGame[];
  loading?: boolean;
  onPlay: (g: LobbyGame) => void;
}) {
  if (!loading && games.length === 0) return null;
  return (
    <section>
      <SectionHeading title={title} />
      <ol className="no-scrollbar rank-row -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 pt-1 md:mx-0 md:px-0">
        {(loading ? Array.from({ length: 10 }) : games.slice(0, 10)).map((g, i) => (
          <li
            key={loading ? i : (g as LobbyGame).id}
            className="rank-item w-[37%] shrink-0 snap-start sm:w-[24%] md:w-[18%] lg:w-[15%] xl:w-[12.5%]"
          >
            <span className="rank-num" aria-hidden>
              {i + 1}
            </span>
            {loading ? (
              <GameTileSkeleton caption={false} />
            ) : (
              <GameTile game={g as LobbyGame} onPlay={onPlay} caption={false} priority={i < 5} />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GameGrid({
  games,
  loading,
  onPlay,
  empty,
}: {
  games: LobbyGame[];
  loading?: boolean;
  onPlay: (g: LobbyGame) => void;
  empty?: ReactNode;
}) {
  if (loading) {
    return (
      <div className={GAME_GRID}>
        {Array.from({ length: 21 }).map((_, i) => (
          <GameTileSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (games.length === 0) return <>{empty}</>;
  return (
    <div className={GAME_GRID}>
      {games.map((g, i) => (
        <GameTile key={g.id} game={g} onPlay={onPlay} priority={i < 7} />
      ))}
    </div>
  );
}
