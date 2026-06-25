import { Play, Loader2 } from "lucide-react";
import { useState } from "react";
import type { PFGameLite } from "@/hooks/use-pf-launch";

interface Props {
  game: PFGameLite;
  rank?: number;
  priority?: boolean;
  loading?: boolean;
  onPlay: (g: PFGameLite) => void;
}

export function PFGameCard({ game, rank, priority, loading, onPlay }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative group">
      {rank && (
        <span className="rank-number absolute left-0 top-1/2 -translate-y-1/2 text-5xl md:text-8xl z-0 pointer-events-none select-none opacity-70">
          {rank}
        </span>
      )}
      <button
        onClick={() => onPlay(game)}
        disabled={loading}
        className="relative z-10 block w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface border border-border hover:border-primary transition-all group-hover:scale-[1.02] touch-manipulation"
      >
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-2 to-surface p-3 text-center">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="size-4 fill-primary text-primary" />
            </div>
            <p className="text-xs font-bold text-white line-clamp-2">{game.name}</p>
            <p className="text-[10px] text-white/50">{game.provider.name}</p>
          </div>
        ) : (
          <img
            src={game.image_url}
            alt={game.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover bg-surface-2"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {loading ? (
            <Loader2 className="size-8 animate-spin text-white" />
          ) : (
            <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Play className="size-5 fill-current" />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-xs font-semibold text-white truncate">{game.name}</p>
          <p className="text-[10px] text-white/60">{game.provider.name}</p>
        </div>
      </button>
    </div>
  );
}
