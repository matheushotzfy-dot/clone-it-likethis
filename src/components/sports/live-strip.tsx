import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSportsEvents } from "@/lib/sports.functions";

/** Faixa horizontal com jogos reais (ao vivo primeiro) e odds 1/X/2. */
export function LiveStrip() {
  const fetchEvents = useServerFn(getSportsEvents);
  const q = useQuery({ queryKey: ["sports-events"], queryFn: () => fetchEvents(), refetchInterval: 5_000, refetchIntervalInBackground: false, staleTime: 4_000 });
  const list = [...(q.data ?? [])]
    .filter((e) => e.odds)
    .sort((a, b) => Number(b.state === "in") - Number(a.state === "in"))
    .slice(0, 12);
  if (!list.length) return null;

  return (
    <section aria-label="Jogos esportivos" className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="title-cond text-xl md:text-2xl">Na arena agora</h2>
        <span className="flex-1" />
        <Link to="/esportes" className="rounded-[4px] border border-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary">
          Esportes
        </Link>
      </div>
      <div className="no-scrollbar -mx-3 flex snap-x gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
        {list.map((e) => {
          const live = e.state === "in";
          return (
            <Link key={`${e.league}-${e.id}`} to="/esportes"
              className="w-[250px] shrink-0 snap-start rounded-md bg-surface p-3 transition-colors hover:bg-surface-2">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {live ? (<><span className="live-dot size-1.5 rounded-full bg-live" /><span className="text-live">Ao vivo</span></>) :
                  new Date(e.start).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                <span className="truncate">· {e.leagueLabel}</span>
              </p>
              {[e.home, e.away].map((t) => (
                <p key={t.name} className="flex items-center gap-2 text-[13px] font-semibold">
                  {t.logo ? <img src={t.logo} alt="" width={16} height={16} loading="lazy" className="size-4 object-contain" /> : <span className="size-4" />}
                  <span className="truncate">{t.name}</span>
                  {live && <span className="ml-auto tabular-nums">{t.score}</span>}
                </p>
              ))}
              <div className="mt-2 grid auto-cols-fr grid-flow-col gap-1">
                {[e.odds!.home, e.odds!.draw, e.odds!.away].filter((o): o is number => o != null).map((o, i) => (
                  <span key={`o-${i}`} className="rounded-[4px] bg-background py-1 text-center text-xs font-bold tabular-nums">{o.toFixed(2)}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
