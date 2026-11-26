import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameTile, GameTileSkeleton } from "./game-tile";
import type { LobbyGame } from "@/hooks/use-games";
import { cn } from "@/lib/utils";

/** Grid denso: 3 capas por linha no celular, até 9 em tela larga. */
export const GAME_GRID =
  "grid grid-cols-3 gap-x-2.5 gap-y-3.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9";

/** Controla a rolagem de um trilho: setas habilitadas só quando há para onde ir. */
function useRail() {
  const ref = useRef<HTMLDivElement | HTMLOListElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };
  return { ref, edges, scroll, update };
}

function RailArrows({ rail, label }: { rail: ReturnType<typeof useRail>; label: string }) {
  if (rail.edges.start && rail.edges.end) return null;
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      <button
        type="button"
        className="rail-arrow"
        onClick={() => rail.scroll(-1)}
        disabled={rail.edges.start}
        aria-label={`Voltar em ${label}`}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        className="rail-arrow"
        onClick={() => rail.scroll(1)}
        disabled={rail.edges.end}
        aria-label={`Avançar em ${label}`}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function SectionHeading({
  title,
  icon,
  count,
  to,
  search,
  extra,
  controls,
  linkLabel = "Ver todos",
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  to?: string;
  search?: Record<string, string>;
  extra?: ReactNode;
  controls?: ReactNode;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2.5">
      <h2 className="flex min-w-0 items-center gap-2 truncate text-[21px] md:text-[25px]">
        {icon}
        <span className="truncate">{title}</span>
      </h2>
      {count !== undefined && count > 0 && (
        <span className="num hidden shrink-0 text-[13px] text-muted-foreground sm:inline">
          {count.toLocaleString("pt-BR")} {count === 1 ? "jogo" : "jogos"}
        </span>
      )}
      {extra}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {to && (
          <Link
            to={to}
            search={search as never}
            className="text-[13px] font-semibold text-primary hover:underline"
          >
            {linkLabel}
            {count !== undefined && count > 0 && (
              <span className="num text-muted-foreground sm:hidden"> ({count})</span>
            )}
          </Link>
        )}
        {controls}
      </div>
    </div>
  );
}

export function GameRail({
  title,
  icon,
  games,
  loading,
  count,
  to,
  search,
  onPlay,
  priority,
  max = 18,
}: {
  title: string;
  icon?: ReactNode;
  games: LobbyGame[];
  loading?: boolean;
  count?: number;
  to?: string;
  search?: Record<string, string>;
  onPlay: (g: LobbyGame) => void;
  priority?: boolean;
  max?: number;
}) {
  const rail = useRail();
  useEffect(() => {
    rail.update();
  }, [games.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!loading && games.length === 0) return null;
  return (
    <section aria-label={title}>
      <SectionHeading
        title={title}
        icon={icon}
        count={count}
        to={to}
        search={search}
        controls={<RailArrows rail={rail} label={title} />}
      />
      <div ref={rail.ref as React.RefObject<HTMLDivElement>} className="rail">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rail-item">
                <GameTileSkeleton />
              </div>
            ))
          : games.slice(0, max).map((g, i) => (
              <div key={g.id} className="rail-item empty:hidden">
                <GameTile game={g} onPlay={onPlay} priority={priority && i < 7} />
              </div>
            ))}
      </div>
    </section>
  );
}

/** Top 10 com numeral dourado atrás de cada capa. */
export function TopTenRail({
  title,
  note,
  games,
  loading,
  onPlay,
}: {
  title: string;
  note?: string;
  games: LobbyGame[];
  loading?: boolean;
  onPlay: (g: LobbyGame) => void;
}) {
  const rail = useRail();
  useEffect(() => {
    rail.update();
  }, [games.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!loading && games.length === 0) return null;
  return (
    <section aria-label={title}>
      <SectionHeading
        title={title}
        extra={
          note ? (
            <span className="hidden truncate text-[13px] text-muted-foreground md:inline">
              {note}
            </span>
          ) : null
        }
        controls={<RailArrows rail={rail} label={title} />}
      />
      <ol
        ref={rail.ref as React.RefObject<HTMLOListElement>}
        className="no-scrollbar rank-row -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 pt-1 md:mx-0 md:px-0"
      >
        {(loading ? Array.from({ length: 10 }) : games.slice(0, 10)).map((g, i) => (
          <li
            key={loading ? i : (g as LobbyGame).id}
            className="rank-item w-[38%] shrink-0 snap-start sm:w-[24%] md:w-[19%] lg:w-[15.5%] xl:w-[13%] 2xl:w-[11%]"
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
    <div className={cn(GAME_GRID)}>
      {games.map((g, i) => (
        <GameTile key={g.id} game={g} onPlay={onPlay} priority={i < 7} />
      ))}
    </div>
  );
}
