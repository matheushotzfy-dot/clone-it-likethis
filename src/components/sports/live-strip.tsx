import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSportsEvents } from "@/lib/sports.functions";
import { SPORTS_POLL_MS } from "@/lib/sports-data";

/** Faixa horizontal com jogos reais (ao vivo primeiro) e odds 1/X/2. */
export function LiveStrip() {
  const fetchEvents = useServerFn(getSportsEvents);
  const q = useQuery({ queryKey: ["sports-events"], queryFn: () => fetchEvents(), refetchInterval: SPORTS_POLL_MS, refetchIntervalInBackground: false, staleTime: 4_000 });
  const list = [...(q.data ?? [])]
    .sort((a, b) => Number(b.state === "in") - Number(a.state === "in"))
    .slice(0, 12);
  if (!list.length) return null;

  return (
    <section aria-label="Jogos esportivos" className="sports-strip space-y-2">
      <div className="sports-strip-heading flex items-center gap-2">
        <h2 className="flex items-center gap-2 font-brand text-xl font-black uppercase tracking-tight md:text-2xl"><span className="live-dot size-2.5 rounded-full bg-live" />Ao vivo agora</h2>
        <span className="flex-1" />
        <Link to="/esportes" className="rounded-full bg-primary px-3.5 py-1.5 font-brand text-[12px] font-extrabold uppercase text-primary-foreground transition hover:brightness-110">
          Ver todos ›
        </Link>
      </div>
      <div className="sports-strip-track no-scrollbar -mx-3 flex snap-x gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
        {list.map((e) => {
          const live = e.state === "in";
          return (
            <Link key={`${e.league}-${e.id}`} to="/esportes"
              className="live-card w-[260px] shrink-0 snap-start rounded-xl p-3.5">
              <p className="sports-card-meta mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {live ? (<><span className="live-dot size-1.5 rounded-full bg-live" /><span className="text-live">Ao vivo</span></>) :
                  new Date(e.start).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                <span className="truncate">· {e.leagueLabel}</span>
              </p>
              {[e.home, e.away].map((t) => (
                <p key={t.name} className="sports-card-team flex min-w-0 items-center gap-2 text-[13px] font-semibold">
                  {t.logo ? <img src={t.logo} alt="" width={16} height={16} loading="lazy" className="size-4 shrink-0 object-contain" /> : <span className="size-4 shrink-0" />}
                  <span className="min-w-0 truncate">{t.name}</span>
                  {live && <span className="ml-auto shrink-0 font-brand text-base font-black tabular-nums">{t.score}</span>}
                </p>
              ))}
              <div className="sports-card-odds mt-2 grid auto-cols-fr grid-flow-col gap-1">
                {e.odds ? [e.odds.home, e.odds.draw, e.odds.away].filter((o): o is number => o != null).map((o, i) => (
                  <span key={`o-${i}`} className="rounded-md bg-background/60 py-1.5 text-center text-xs font-bold tabular-nums text-foreground ring-1 ring-foreground/10 transition hover:bg-primary hover:text-primary-foreground">{o.toFixed(2)}</span>
                )) : <span className="text-[10px] text-muted-foreground">Cotações indisponíveis na fonte</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
