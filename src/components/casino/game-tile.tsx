import { useEffect, useRef, useState } from "react";
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
 * Selos só com fato: "Ao vivo" para mesa com crupiê e "Novo" para jogo que
 * entrou no catálogo há menos de 14 dias.
 */
export function GameTile({ game, onPlay, priority, caption = true }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A imagem pode terminar de carregar antes do React assumir a página (SSR/cache);
  // nesse caso o onLoad não dispara, então confere o estado ao montar.
  useEffect(() => {
    const el = img.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, [game.image_url]);
  if (!game.image_url || failed) return null;
  const live = game.category === "live";

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onPlay(game)}
        aria-label={`Jogar ${game.name}, ${game.provider}`}
        className="game-tile w-full text-left"
      >
        {!loaded && <span className="skeleton absolute inset-0" aria-hidden />}
        <img
          ref={img}
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
        {(live || game.isNew) && (
          <span className="game-tile-badges" aria-hidden>
            {live && (
              <span className="game-badge game-badge-live">
                <span className="live-dot live-dot-sm" /> Ao vivo
              </span>
            )}
            {game.isNew && <span className="game-badge game-badge-new">Novo</span>}
          </span>
        )}
        <span className="game-tile-hover" aria-hidden>
          <span className="game-tile-play-round">
            <Play className="size-5 translate-x-[1px] fill-current" />
          </span>
          <span className="game-tile-provider">{game.provider}</span>
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
