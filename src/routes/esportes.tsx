import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio, CalendarClock, Trophy } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/page-meta";
import { getSportsEvents, LEAGUES } from "@/lib/sports.functions";
import { SPORTS_POLL_MS } from "@/lib/sports-data";
import { EventRow, type Selection } from "@/components/sports/event-row";
import { BetSlip } from "@/components/sports/bet-slip";

export const Route = createFileRoute("/esportes")({
  head: () => ({
    meta: pageMeta(
      "Apostas Esportivas ao vivo — Copa, Brasileirão e NBA | apostamaxy",
      "Acompanhe campeonatos brasileiros, placares ao vivo e próximos jogos com cotações pré-jogo publicadas pela fonte na apostamaxy.",
    ),
  }),
  component: Page,
});

type Tab = "live" | "next";

function Page() {
  const fetchEvents = useServerFn(getSportsEvents);
  const q = useQuery({ queryKey: ["sports-events"], queryFn: () => fetchEvents(), refetchInterval: SPORTS_POLL_MS, refetchIntervalInBackground: false, staleTime: 4_000 });
  const [tab, setTab] = useState<Tab>("next");
  const [league, setLeague] = useState<string | null>(null);
  const [brazilOnly, setBrazilOnly] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  const events = useMemo(() => {
    const list = q.data ?? [];
    return list.filter((e) => (tab === "live" ? e.state === "in" : e.state === "pre") && (!league || e.league === league) && (!brazilOnly || e.league.startsWith("bra.")));
  }, [q.data, tab, league, brazilOnly]);
  const currentEvent = selection ? q.data?.find((e) => e.id === selection.event.id && e.league === selection.event.league) : undefined;
  const currentOdd = selection && currentEvent?.odds?.[selection.pick];
  const activeSelection = selection && currentEvent && currentOdd && currentOdd === selection.odd && !q.isError
    ? { ...selection, event: currentEvent } : null;
  const liveCount = (q.data ?? []).filter((e) => e.state === "in").length;

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-[1400px] gap-4 px-3 py-4 md:px-6 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-4">
          <header className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h1 className="title-cond text-3xl">Esportes</h1>
          </header>
          <p className="text-xs text-muted-foreground">ESPN · Consulta a cada 5 s · Cotações pré-jogo quando disponíveis</p>

          <div className="flex gap-1 rounded-full bg-surface p-1 w-fit" role="tablist">
            {([["live", `Ao Vivo (${liveCount})`, Radio], ["next", "Próximos", CalendarClock]] as const).map(([k, label, Icon]) => (
              <Button key={k} role="tab" aria-selected={tab === k} variant="ghost" size="sm" onClick={() => setTab(k)}
                className={cn("rounded-full", tab === k && "bg-surface-2 text-foreground")}>
                <Icon className={cn("size-4", k === "live" && "text-live")} /> {label}
              </Button>
            ))}
          </div>

          <div className="edge-fade flex gap-2 overflow-x-auto pb-1">
            <Button size="sm" className="shrink-0" variant={league === null && !brazilOnly ? "default" : "secondary"} onClick={() => { setLeague(null); setBrazilOnly(false); }}>Todas</Button>
            <Button size="sm" className="shrink-0" variant={brazilOnly ? "default" : "secondary"} onClick={() => { setLeague(null); setBrazilOnly(true); }}>Brasil</Button>
            {LEAGUES.filter((l) => !brazilOnly || l.brazil).map((l) => (
              <Button key={l.id} size="sm" className="shrink-0" variant={league === l.id ? "default" : "secondary"} onClick={() => setLeague(l.id)}>
                {l.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {q.isError && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar os jogos. Tente novamente.</p>}
            {q.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={`sk-${i}`} className="h-[92px] rounded-lg" />)}
            {!q.isLoading && events.length === 0 && (
              <p className="rounded-lg bg-surface p-8 text-center text-sm text-muted-foreground">
                {tab === "live" ? "Nenhum jogo ao vivo agora." : "Nenhum jogo encontrado para este filtro."}
              </p>
            )}
            {events.map((e) => (
              <EventRow key={`${e.league}-${e.id}`} event={q.isError ? { ...e, odds: null } : e} selected={activeSelection?.event.id === e.id ? activeSelection.pick : null} onPick={setSelection} />
            ))}
          </div>
        </section>

        <div className="lg:sticky lg:top-20 lg:self-start max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[calc(64px+env(safe-area-inset-bottom))] max-lg:z-40 max-lg:px-3">
          <div className={cn(!selection && "max-lg:hidden")}>
            {selection && !activeSelection && <p role="status" className="bg-surface px-4 pt-3 text-xs text-muted-foreground">Cotação alterada ou indisponível. Selecione novamente.</p>}
            <BetSlip selection={activeSelection} onClear={() => setSelection(null)} />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
