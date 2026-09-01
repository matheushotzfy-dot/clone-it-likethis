import { Play, Loader2, Gamepad2 } from "lucide-react";
import { useState } from "react";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

interface Props {
  game: PFGameLite;
  /** 1-based position; only rendered on the "most played" rail. */
  rank?: number;
  priority?: boolean;
  loading?: boolean;
  onPlay: (g: PFGameLite) => void;
}

/**
 * Crisp game tile: hairline border, short bottom scrim, no floating badges.
 * Hover is a 2px lift plus a gold hairline — nothing blurred, nothing neon.
 */
export function PFGameCard({ game, rank, priority, loading, onPlay }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={() => onPlay(game)}
      disabled={loading}
      aria-label={`Jogar ${game.name}`}
      className={cn(
        "tile group relative block w-full overflow-hidden rounded-[8px] border border-border bg-surface text-left",
        "aspect-[3/4]",
      )}
    >
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface p-3 text-center">
          <Gamepad2 className="size-5 text-muted-foreground" strokeWidth={1.75} />
          <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{game.name}</p>
          <p className="text-[10px] text-muted-foreground">{game.provider.name}</p>
        </div>
      ) : (
        <>
          {!loaded && <div className="skeleton absolute inset-0" />}
          <img
            src={game.image_url}
            alt={game.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 240px"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "size-full object-cover transition-[transform,opacity] duration-200 ease-out group-hover:scale-[1.02]",
              loaded ? "opacity-100" : "opacity-0",
            )}
            draggable={false}
          />
        </>
      )}

      {/* short scrim only where text sits */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-background via-background/75 to-transparent" />

      {rank !== undefined && (
        <span
          className={cn(
            "font-display pointer-events-none absolute left-1.5 top-1 select-none text-[15px] font-bold leading-none tabular-nums",
            rank <= 3 ? "text-gold" : "text-foreground/45",
          )}
        >
          {rank}
        </span>
      )}

      <span className="pointer-events-none absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-[6px] bg-background/70 opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100">
        {loading ? (
          <Loader2 className="size-3.5 animate-spin text-gold" />
        ) : (
          <Play className="size-3 fill-current text-gold" />
        )}
      </span>

      {!failed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-1.5">
          <p className="truncate text-[11.5px] font-semibold leading-tight md:text-xs">{game.name}</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {game.provider.name}
          </p>
        </div>
      )}
    </button>
  );
}
