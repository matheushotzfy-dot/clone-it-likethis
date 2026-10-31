import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SportEvent } from "@/lib/sports.functions";

export type Pick = "home" | "draw" | "away";
export interface Selection { event: SportEvent; pick: Pick; odd: number }

interface EventRowProps {
  event: SportEvent;
  selected: Pick | null;
  onPick: (s: Selection) => void;
}

function Team({ name, logo, score, live }: { name: string; logo?: string; score?: string; live: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {logo ? (
        <img src={logo} alt="" width={20} height={20} loading="lazy" className="size-5 shrink-0 object-contain" />
      ) : (
        <span className="size-5 shrink-0 rounded-full bg-surface-2" />
      )}
      <span className="truncate text-[13px] font-semibold">{name}</span>
      {live && <span className="ml-auto pl-2 text-sm font-bold tabular-nums">{score ?? "0"}</span>}
    </div>
  );
}

export function EventRow({ event, selected, onPick }: EventRowProps) {
  const live = event.state === "in";
  const time = new Date(event.start).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const picks: Array<{ key: Pick; label: string; odd: number | null }> = event.odds
    ? [
        { key: "home", label: "1", odd: event.odds.home },
        ...(event.sport === "soccer" ? [{ key: "draw" as Pick, label: "X", odd: event.odds.draw }] : []),
        { key: "away", label: "2", odd: event.odds.away },
      ]
    : [];

  return (
    <article className="sports-event grid gap-3 rounded-lg bg-surface p-3 transition-colors hover:bg-surface-2/70 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          {live ? (
            <span className="flex items-center gap-1.5 text-live">
              <span className="live-dot size-1.5 rounded-full bg-live" /> AO VIVO · {event.clock}
            </span>
          ) : (
            <span className="capitalize">{time}</span>
          )}
          <span className="truncate">· {event.leagueLabel}</span>
        </div>
        <Team {...event.home} live={live} />
        <Team {...event.away} live={live} />
      </div>
      <div className="grid auto-cols-fr grid-flow-col gap-2 md:w-[260px]">
        {picks.length === 0 && (
          <span className="col-span-3 rounded-md border border-border px-3 py-2 text-center text-xs text-muted-foreground">
            {live ? "Odds ao vivo indisponíveis na fonte" : "Fonte sem cotação para este jogo"}
          </span>
        )}
        {picks.map((p) => (
          <Button
            key={p.key}
            variant="secondary"
            disabled={!p.odd}
            aria-pressed={selected === p.key}
            aria-label={`${p.label} odd ${p.odd ?? "-"}`}
            onClick={() => p.odd && onPick({ event, pick: p.key, odd: p.odd })}
            className={cn(
              "h-11 flex-col gap-0 rounded-md bg-surface-2 transition-all hover:bg-primary/15",
              selected === p.key && "bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            <span className="text-[10px] font-semibold opacity-70">{p.label}</span>
            <span className="text-sm font-bold tabular-nums">{p.odd ? p.odd.toFixed(2) : "-"}</span>
          </Button>
        ))}
      </div>
      {event.odds && <p className="text-[10px] text-muted-foreground md:col-span-2">{event.oddsSource} via ESPN · Pré-jogo</p>}
    </article>
  );
}
