import { useState } from "react";
import { Play } from "lucide-react";
import type { LobbyGame } from "@/hooks/use-games";

interface Props {
  game: LobbyGame;
  onPlay: (game: LobbyGame) => void;
  priority?: boolean;
  /** Mostra o nome e o provedor abaixo da capa (desligado no Top 10). */
  caption?: boolean;
}

/**
 * Capa de jogo. Se a arte não carregar, a capa some em vez de deixar um
 * buraco no grid (regra do projeto para imagens de jogo).
 */
export function GameTile({ game, onPlay, priority, caption = true }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!game.image_url || failed) return null;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onPlay(game)}
        aria-label={`Jogar ${game.name}`}
        className="game-tile w-full text-left"
      >
        {!loaded && <span className="skeleton absolute inset-0" aria-hidden />}
        <img
          src={game.image_url}
          alt=""
          width={300}
          height={400}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={loaded ? "opacity-100" : "opacity-0"}
        />
        <span className="game-tile-play" aria-hidden>
          <Play className="size-3.5 fill-current" /> Jogar
        </span>
      </button>
      {caption && (
        <div className="mt-1.5 min-w-0 px-0.5">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground/90">
            {game.name}
          </p>
          <p className="truncate text-[11.5px] leading-tight text-muted-foreground">
            {game.provider}
          </p>
        </div>
      )}
    </div>
  );
}

export function GameTileSkeleton({ caption = true }: { caption?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="skeleton aspect-[3/4] rounded-[10px]" />
      {caption && (
        <div className="mt-1.5 space-y-1 px-0.5">
          <div className="skeleton h-3 w-4/5 rounded" />
          <div className="skeleton h-2.5 w-1/2 rounded" />
        </div>
      )}
    </div>
  );
}
