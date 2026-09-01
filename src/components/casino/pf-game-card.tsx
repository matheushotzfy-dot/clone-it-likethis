import { Play, Loader2, Gamepad2, Flame, Radio } from "lucide-react";
import { useState } from "react";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

export type CardAccent = "hot" | "crash" | "live" | "slots" | "neutral";

const accentClass: Record<CardAccent, string> = {
  hot: "cat-hot",
  crash: "cat-crash",
  live: "cat-live",
  slots: "cat-slots",
  neutral: "cat-neutral",
};

interface Props {
  game: PFGameLite;
  /** Category accent — drives border glow, badge and play button colour. */
  accent?: CardAccent;
  rank?: number;
  priority?: boolean;
  loading?: boolean;
  onPlay: (g: PFGameLite) => void;
}

export function PFGameCard({ game, accent = "neutral", rank, priority, loading, onPlay }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const topRank = rank !== undefined && rank <= 3;

  return (
    <div className={cn("group relative", accentClass[accent])}>
      <button
        onClick={() => onPlay(game)}
        disabled={loading}
        aria-label={`Jogar ${game.name}`}
        className={cn(
          "game-card relative z-10 block w-full overflow-hidden rounded-xl border bg-surface text-left",
          "aspect-[3/4]",
          topRank ? "border-cat" : "border-border",
        )}
      >
        {failed ? (
          <div className="surface-grad absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="bg-cat-soft border-cat grid size-9 place-items-center rounded-lg border">
              <Gamepad2 className="text-cat size-4" strokeWidth={2} />
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
                "size-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.08]",
                loaded ? "opacity-100" : "opacity-0",
              )}
              draggable={false}
            />
          </>
        )}

        {/* readability gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent" />

        {/* hover / press play */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100">
          <span
            className={cn(
              "grid size-12 place-items-center rounded-full text-background shadow-lg backdrop-blur-sm transition-transform duration-200 group-hover:scale-110",
            )}
            style={{ background: "var(--cat, var(--primary))" }}
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5 fill-current" />}
          </span>
        </div>

        {/* badges */}
        <div className="pointer-events-none absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-1">
          {rank !== undefined ? (
            <span
              className={cn(
                "font-display select-none text-2xl font-extrabold italic leading-none md:text-3xl",
                topRank ? "text-cat drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" : "text-foreground/45",
              )}
            >
              {rank}
            </span>
          ) : (
            <span />
          )}
          {accent === "hot" && (
            <span className="badge-chip bg-cat-soft text-cat border-cat border">
              <Flame className="size-2.5" strokeWidth={3} /> Hot
            </span>
          )}
          {accent === "live" && (
            <span className="badge-chip bg-cat-soft text-cat border-cat border">
              <Radio className="size-2.5 soft-pulse" strokeWidth={3} /> Ao vivo
            </span>
          )}
        </div>

        {!failed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2">
            <p className="truncate text-[11px] font-bold leading-tight md:text-xs">{game.name}</p>
            <p className="truncate text-[10px] font-semibold text-muted-foreground">{game.provider.name}</p>
          </div>
        )}
      </button>
    </div>
  );
}
