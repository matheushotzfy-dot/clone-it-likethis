import { Play, Loader2, Gamepad2 } from "lucide-react";
import { useState } from "react";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

interface Props {
  game: PFGameLite;
  rank?: number;
  priority?: boolean;
  loading?: boolean;
  onPlay: (g: PFGameLite) => void;
}

export function PFGameCard({ game, rank, priority, loading, onPlay }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group relative">
      <button
        onClick={() => onPlay(game)}
        disabled={loading}
        aria-label={`Jogar ${game.name}`}
        className={cn(
          "slick relative z-10 block w-full overflow-hidden rounded-[10px] border border-border bg-surface text-left",
          "aspect-[3/4] hover:border-primary/70",
        )}
      >
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface p-3 text-center">
            <span className="grid size-9 place-items-center rounded-md border border-primary/40 text-primary">
              <Gamepad2 className="size-4" strokeWidth={1.75} />
            </span>
            <p className="line-clamp-2 text-[11px] font-bold leading-tight">{game.name}</p>
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
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                "size-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.06]",
                loaded ? "opacity-100" : "opacity-0",
              )}
              draggable={false}
            />
          </>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-primary/90 text-primary-foreground backdrop-blur-sm">
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5 fill-current" />}
          </span>
        </div>

        {rank !== undefined && (
          <span className="rank-number pointer-events-none absolute left-1.5 top-0.5 z-10 select-none text-3xl leading-none md:text-4xl">
            {rank}
          </span>
        )}

        {!failed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2">
            <p className="truncate text-[11px] font-bold leading-tight md:text-xs">{game.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{game.provider.name}</p>
          </div>
        )}
      </button>
    </div>
  );
}
