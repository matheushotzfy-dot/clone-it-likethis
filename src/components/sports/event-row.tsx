import type { SportEvent } from "@/lib/sports.functions";
import { formatWhen } from "@/lib/format";

export type Pick = "home" | "draw" | "away";
export interface Selection {
  event: SportEvent;
  pick: Pick;
  odd: number;
}

function Team({
  name,
  logo,
  score,
  live,
}: {
  name: string;
  logo?: string;
  score?: string;
  live: boolean;
}) {
  return (
    <div className="flex h-7 min-w-0 items-center gap-2.5">
      {logo ? (
        <img
          src={logo}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          className="size-[22px] shrink-0 object-contain"
        />
      ) : (
        <span className="size-[22px] shrink-0 rounded-full bg-surface-2" />
      )}
      <span className="truncate text-[15px] font-medium">{name}</span>
      {live && (
        <span className="num ml-auto pl-2 font-display text-[20px] font-bold">{score ?? "0"}</span>
      )}
    </div>
  );
}

export function EventRow({
  event,
  selected,
  onPick,
}: {
  event: SportEvent;
  selected: Pick | null;
  onPick: (s: Selection) => void;
}) {
  const live = event.state === "in";
  const picks: { key: Pick; label: string; odd: number | null }[] = event.odds
    ? [
        { key: "home", label: "Casa", odd: event.odds.home },
        ...(event.sport === "soccer"
          ? [{ key: "draw" as Pick, label: "Empate", odd: event.odds.draw }]
          : []),
        { key: "away", label: "Fora", odd: event.odds.away },
      ]
    : [];

  return (
    <article className="event-card grid gap-3 p-3.5 md:grid-cols-[1fr_300px] md:items-center md:gap-5 md:px-5">
      <div className="min-w-0">
        <p className="mb-1.5 flex items-center gap-2 truncate text-[12.5px] text-muted-foreground">
          {live ? (
            <span className="flex items-center gap-1.5 font-semibold text-live">
              <span className="live-dot" /> {event.clock || "Ao vivo"}
            </span>
          ) : (
            <span>{formatWhen(event.start)}</span>
          )}
          <span className="truncate">{event.leagueLabel}</span>
        </p>
        <Team {...event.home} live={live} />
        <Team {...event.away} live={live} />
      </div>
      {picks.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-border px-3 py-3 text-center text-[13px] text-muted-foreground">
          {live ? "Apostas fechadas durante o jogo" : "Sem cotação para este jogo"}
        </p>
      ) : (
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {picks.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={!p.odd}
              data-active={selected === p.key}
              aria-pressed={selected === p.key}
              aria-label={`${p.label}, odd ${p.odd?.toFixed(2) ?? "indisponível"}`}
              onClick={() => p.odd && onPick({ event, pick: p.key, odd: p.odd })}
              className="odd-btn"
            >
              <span className="text-[12px] opacity-75">{p.label}</span>
              <span className="num font-display text-[19px] font-bold leading-none">
                {p.odd ? p.odd.toFixed(2) : "–"}
              </span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
