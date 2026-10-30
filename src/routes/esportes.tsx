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
import { EventRow, type Selection } from "@/components/sports/event-row";
import { BetSlip } from "@/components/sports/bet-slip";

export const Route = createFileRoute("/esportes")({
  head: () => ({
    meta: pageMeta(
      "Apostas Esportivas ao vivo — Copa, Brasileirão e NBA | apostamaxy",
      "Aposte em futebol e basquete com odds atualizadas, jogos ao vivo e próximos jogos. Depósito via PIX na apostamaxy.",
    ),
  }),
  component: Page,
});

type Tab = "live" | "next";

function Page() {
  const fetchEvents = useServerFn(getSportsEvents);
  const q = useQuery({ queryKey: ["sports-events"], queryFn: () => fetchEvents(), refetchInterval: 30_000, staleTime: 20_000 });
  const [tab, setTab] = useState<Tab>("next");
  const [league, setLeague] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const events = useMemo(() => {
    const list = q.data ?? [];
    return list.filter((e) => (tab === "live" ? e.state === "in" : e.state === "pre") && (!league || e.league === league));
  }, [q.data, tab, league]);
  const liveCount = (q.data ?? []).filter((e) => e.state === "in").length;

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-[1400px] gap-4 px-3 py-4 md:px-6 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-4">
          <header className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h1 className="text-xl font-bold">Esportes</h1>
          </header>

          <div className="flex gap-1 rounded-full bg-surface p-1 w-fit" role="tablist">
            {([["live", `Ao Vivo (${liveCount})`, Radio], ["next", "Próximos", CalendarClock]] as const).map(([k, label, Icon]) => (
              <Button key={k} role="tab" aria-selected={tab === k} variant="ghost" size="sm" onClick={() => setTab(k)}
                className={cn("rounded-full", tab === k && "bg-surface-2 text-foreground")}>
                <Icon className={cn("size-4", k === "live" && "text-live")} /> {label}
              </Button>
            ))}
          </div>

          <div className="edge-fade flex gap-2 overflow-x-auto pb-1">
            <Button size="sm" variant={league === null ? "default" : "secondary"} onClick={() => setLeague(null)}>Todas</Button>
            {LEAGUES.map((l) => (
              <Button key={l.id} size="sm" className="shrink-0" variant={league === l.id ? "default" : "secondary"} onClick={() => setLeague(l.id)}>
                {l.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {q.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={`sk-${i}`} className="h-[92px] rounded-lg" />)}
            {!q.isLoading && events.length === 0 && (
              <p className="rounded-lg bg-surface p-8 text-center text-sm text-muted-foreground">
                {tab === "live" ? "Nenhum jogo ao vivo agora." : "Nenhum jogo encontrado para este filtro."}
              </p>
            )}
            {events.map((e) => (
              <EventRow key={`${e.league}-${e.id}`} event={e} selected={selection?.event.id === e.id ? selection.pick : null} onPick={setSelection} />
            ))}
          </div>
        </section>

        <div className="lg:sticky lg:top-20 lg:self-start max-lg:fixed max-lg:inset-x-0 max-lg:bottom-16 max-lg:z-40 max-lg:px-3">
          <div className={cn(!selection && "max-lg:hidden")}>
            <BetSlip selection={selection} onClear={() => setSelection(null)} />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
