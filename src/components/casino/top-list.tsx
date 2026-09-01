import { Loader2 } from "lucide-react";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

interface Props {
  items: PFGameLite[];
  launchingCode: string | null;
  onPlay: (g: PFGameLite) => void;
}

/** Ranked list (not cards): number, thumbnail, title, provider. */
export function TopList({ items, launchingCode, onPlay }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((g, i) => (
        <button
          key={`t-${g.game_code}-${i}`}
          onClick={() => onPlay(g)}
          disabled={launchingCode === g.game_code}
          className="group flex w-full items-center gap-3 py-1.5 text-left transition-colors hover:bg-surface/50"
        >
          <span
            className={cn(
              "font-display w-5 shrink-0 text-center text-[13px] font-bold tabular-nums",
              i < 3 ? "text-gold" : "text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <img
            src={g.image_url}
            alt={g.name}
            loading="lazy"
            decoding="async"
            className="size-10 shrink-0 rounded-[6px] border border-border object-cover"
            draggable={false}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold leading-tight">{g.name}</span>
            <span className="block truncate text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
              {g.provider.name}
            </span>
          </span>
          <span className="shrink-0 pr-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-gold">
            {launchingCode === g.game_code ? (
              <Loader2 className="size-3.5 animate-spin text-gold" />
            ) : (
              "Jogar"
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
