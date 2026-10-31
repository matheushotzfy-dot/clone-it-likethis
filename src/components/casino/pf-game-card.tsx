import { Play, Loader2 } from "lucide-react";
import { useState } from "react";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getGameArtwork } from "@/lib/game-artwork";

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
  // Use the existing local artwork for this known provider-image failure.
  const matchedArtwork = getGameArtwork(game.name, game.provider.name);
  const [usingProviderFallback, setUsingProviderFallback] = useState(false);

  return (
    <div className="min-w-0">
    <Button variant="ghost"
      onClick={() => onPlay(game)}
      disabled={loading}
      aria-label={`Jogar ${game.name}`}
      className="lift group relative block h-auto w-full p-0 overflow-hidden rounded-lg bg-surface hover:bg-surface text-left aspect-[3/4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-card p-3 text-center">
          <span className="font-display grid size-11 place-items-center rounded-full bg-primary/15 text-lg font-black text-primary">
            {game.name.trim().charAt(0).toUpperCase()}
          </span>
          <p className="line-clamp-2 text-[11px] font-bold leading-tight">{game.name}</p>
        </div>
      ) : (
        <>
          {!loaded && <div className="skeleton absolute inset-0" />}
          <img
            src={!usingProviderFallback && matchedArtwork ? matchedArtwork : game.image_url}
            alt={game.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={300}
            height={400}
            sizes="(max-width: 640px) 31vw, (max-width: 1024px) 16vw, 160px"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (matchedArtwork && !usingProviderFallback) {
                setUsingProviderFallback(true);
                setLoaded(false);
              } else setFailed(true);
            }}
            className={cn(
              "size-full object-cover transition-[transform,opacity] duration-300 ease-out group-hover:scale-[1.03]",
              loaded ? "opacity-100" : "opacity-0",
            )}
            draggable={false}
          />
        </>
      )}

      {/* centred play affordance */}
      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10">
        <span className={cn("title-cond flex h-8 translate-y-2 items-center justify-center gap-1.5 rounded-[4px] bg-primary text-sm text-primary-foreground opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100", loading && "translate-y-0 opacity-100")}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-3.5 fill-current" />}
          Jogar
        </span>
      </div>

      {rank !== undefined && rank <= 10 && (
        <span
          className={cn(
            "font-display pointer-events-none absolute left-0 top-0 grid h-6 min-w-6 place-items-center rounded-br-[4px] px-1.5 text-[11px] font-bold tabular-nums",
            rank <= 3 ? "bg-primary text-background" : "bg-background/75 text-foreground/80",
          )}
        >
          {rank}
        </span>
      )}

    </Button>
      <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="size-1.5 shrink-0 rounded-full bg-live" />
        <span className="truncate">{game.provider.name}</span>
      </p>
    </div>
  );
}
