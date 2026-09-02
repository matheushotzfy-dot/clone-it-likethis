import { Play, Loader2, Gamepad2 } from "lucide-react";
import { useState } from "react";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

interface Props {
  game: PFGameLite;
  /** 1-based position; rendered as a small corner number on ranked rows. */
  rank?: number;
  priority?: boolean;
  loading?: boolean;
  onPlay: (g: PFGameLite) => void;
}

/**
 * Game tile: full artwork, hairline border, centred play overlay on hover/press.
 * Effects stay crisp — 3px lift, gold hairline, light sweep. No blur, no neon.
 */
export function PFGameCard({ game, rank, priority, loading, onPlay }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={() => onPlay(game)}
      disabled={loading}
      aria-label={`Jogar ${game.name}`}
      className="tile sweep group relative block w-full overflow-hidden rounded-[10px] border border-border bg-surface text-left aspect-[3/4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
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
              "size-full object-cover transition-[transform,opacity] duration-300 ease-out group-hover:scale-[1.05]",
              loaded ? "opacity-100" : "opacity-0",
            )}
            draggable={false}
          />
        </>
      )}

      {/* scrim only where the text sits */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-background via-background/70 to-transparent" />

      {/* centred play affordance */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/0 transition-colors duration-200 group-hover:bg-background/35 group-active:bg-background/35">
        <span className="grid size-10 scale-75 place-items-center rounded-full bg-gold text-background opacity-0 shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent-gold)_22%,transparent),0_8px_20px_-8px_rgba(0,0,0,.95)] transition-[opacity,transform] duration-200 ease-out group-hover:scale-100 group-hover:opacity-100 group-active:scale-100 group-active:opacity-100 md:size-11">
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
        </span>
      </div>

      {rank !== undefined && rank <= 10 && (
        <span
          className={cn(
            "font-display pointer-events-none absolute left-0 top-0 grid h-6 min-w-6 place-items-center rounded-br-[8px] px-1.5 text-[11px] font-bold tabular-nums",
            rank <= 3 ? "bg-gold text-background" : "bg-background/75 text-foreground/80",
          )}
        >
          {rank}
        </span>
      )}

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
