import { Play } from "lucide-react";
import { useState } from "react";
import type { Game } from "@/lib/games";
import { useGameAccess } from "@/hooks/use-game-access";
import { hasGameImage } from "@/lib/game-image";

interface Props { game: Game; rank?: number; priority?: boolean }

export function GameCard({ game, rank, priority }: Props) {
  const { tryPlay } = useGameAccess();
  const [failed, setFailed] = useState(false);
  if (!hasGameImage(game.image, failed)) return null;
  return (
    <div className="relative group">
      {rank && (
        <span className="rank-number absolute left-0 top-1/2 -translate-y-1/2 text-5xl md:text-8xl z-0 pointer-events-none select-none opacity-70">
          {rank}
        </span>
      )}
      <button
        onClick={() => tryPlay(game.name)}
        className="relative z-10 block w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface border border-border hover:border-primary transition-all group-hover:scale-[1.02] touch-manipulation"
      >
          <img
            src={game.image}
            alt={game.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            width={300}
            height={400}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 180px"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover bg-surface-2"
            draggable={false}
          />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Play className="size-5 fill-current" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
          <p className="text-xs font-semibold text-white truncate">{game.name}</p>
          <p className="text-[10px] text-white/60">{game.provider}</p>
        </div>
      </button>
    </div>
  );
}
