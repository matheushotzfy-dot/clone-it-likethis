import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSportsEvents } from "@/lib/sports.functions";
import { SPORTS_POLL_MS } from "@/lib/sports-data";
import { formatWhen } from "@/lib/format";

/** Faixa da home: jogos ao vivo primeiro, depois os próximos com cotação. */
export function LiveStrip() {
  const fetchEvents = useServerFn(getSportsEvents);
  const q = useQuery({
    queryKey: ["sports-events"],
    queryFn: () => fetchEvents(),
    refetchInterval: SPORTS_POLL_MS * 4,
    staleTime: 10_000,
  });
  const all = q.data ?? [];
  const live = all.filter((e) => e.state === "in");
  const list = [...live, ...all.filter((e) => e.state === "pre" && e.odds)].slice(0, 12);
  if (!list.length) return null;

  return (
    <section aria-label="Esportes">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="flex items-center gap-2 text-[22px] md:text-[26px]">
          {live.length > 0 && <span className="live-dot" aria-hidden />}
          {live.length > 0 ? "Rolando agora" : "Próximos jogos"}
        </h2>
        {live.length > 0 && (
          <span className="num text-[13px] text-muted-foreground">{live.length} ao vivo</span>
        )}
        <Link
          to="/esportes"
          className="ml-auto text-[13px] font-semibold text-primary hover:underline"
        >
          Ver esportes
        </Link>
      </div>
      <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 md:mx-0 md:px-0">
        {list.map((e) => {
          const isLive = e.state === "in";
          const odds = e.odds
            ? [e.odds.home, e.odds.draw, e.odds.away].filter((o): o is number => o != null)
            : [];
          return (
            <Link
              key={`${e.league}-${e.id}`}
              to="/esportes"
              className="event-card w-[262px] shrink-0 snap-start p-3.5 transition-colors hover:border-primary/50"
            >
              <p className="mb-2 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                {isLive ? (
                  <span className="font-semibold text-live">{e.clock || "Ao vivo"}</span>
                ) : (
                  <span>{formatWhen(e.start)}</span>
                )}
                <span className="truncate">{e.leagueLabel}</span>
              </p>
              {[e.home, e.away].map((t) => (
                <p
                  key={t.name}
                  className="flex h-6 min-w-0 items-center gap-2 text-[14px] font-medium"
                >
                  {t.logo ? (
                    <img
                      src={t.logo}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                      className="size-[18px] shrink-0 object-contain"
                    />
                  ) : (
                    <span className="size-[18px] shrink-0 rounded-full bg-surface-2" />
                  )}
                  <span className="min-w-0 truncate">{t.name}</span>
                  {isLive && (
                    <span className="num ml-auto font-display text-[18px] font-bold">
                      {t.score ?? 0}
                    </span>
                  )}
                </p>
              ))}
              {odds.length > 0 && (
                <div className="mt-2.5 grid auto-cols-fr grid-flow-col gap-1.5">
                  {odds.map((o, i) => (
                    <span
                      key={i}
                      className="num rounded-[7px] bg-surface-2 py-1.5 text-center text-[13px] font-semibold"
                    >
                      {o.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
