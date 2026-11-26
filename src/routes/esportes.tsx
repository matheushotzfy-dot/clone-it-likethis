import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/layout/site-shell";
import { pageMeta } from "@/lib/page-meta";
import { getSportsEvents, LEAGUES } from "@/lib/sports.functions";
import { SPORTS_POLL_MS } from "@/lib/sports-data";
import { EventRow, type Selection } from "@/components/sports/event-row";
import { BetSlip } from "@/components/sports/bet-slip";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SportsSearch = { liga?: string; aba?: "ao-vivo" };

export const Route = createFileRoute("/esportes")({
  validateSearch: (s: Record<string, unknown>): SportsSearch => ({
    liga:
      typeof s.liga === "string" &&
      (s.liga === "brasil" || s.liga === "basquete" || LEAGUES.some((l) => l.id === s.liga))
        ? s.liga
        : undefined,
    aba: s.aba === "ao-vivo" ? "ao-vivo" : undefined,
  }),
  head: () => ({
    meta: pageMeta(
      "Apostas esportivas | apostamaxy",
      "Brasileirão, Libertadores, Champions, Premier League e NBA com placar ao vivo e cotações pré-jogo.",
    ),
  }),
  component: Page,
});

type Tab = "next" | "live";

function Page() {
  const { user } = useAuth();
  const fetchEvents = useServerFn(getSportsEvents);
  const q = useQuery({
    queryKey: ["sports-events"],
    queryFn: () => fetchEvents(),
    refetchInterval: SPORTS_POLL_MS,
    staleTime: 4_000,
  });
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/esportes" });
  const tab: Tab = search.aba === "ao-vivo" ? "live" : "next";
  const league = search.liga ?? "all";
  const setTab = (t: Tab) =>
    navigate({
      search: (prev) => ({ ...prev, aba: t === "live" ? "ao-vivo" : undefined }),
      replace: true,
    });
  const setLeague = (l: string) =>
    navigate({ search: (prev) => ({ ...prev, liga: l === "all" ? undefined : l }), replace: true });
  const [selection, setSelection] = useState<Selection | null>(null);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const liveCount = all.filter((e) => e.state === "in").length;
  const leaguesWithGames = useMemo(() => new Set(all.map((e) => e.league)), [all]);
  const events = useMemo(
    () =>
      all.filter(
        (e) =>
          (tab === "live" ? e.state === "in" : e.state === "pre") &&
          (league === "all" ||
            (league === "brasil"
              ? e.league.startsWith("bra.")
              : league === "basquete"
                ? e.sport === "basketball"
                : e.league === league)),
      ),
    [all, tab, league],
  );

  // A seleção só vale enquanto a odd for a mesma que o jogador viu.
  const current = selection
    ? all.find((e) => e.id === selection.event.id && e.league === selection.event.league)
    : undefined;
  const sameOdd = !!(
    selection &&
    current?.odds?.[selection.pick] === selection.odd &&
    current.state === "pre"
  );
  const active = selection && sameOdd ? { ...selection, event: current! } : null;

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-[1400px] gap-6 px-3 py-4 md:px-6 md:py-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[32px] md:text-[38px]">Esportes</h1>
            {user && (
              <Link
                to="/historico"
                search={{ aba: "esportes" }}
                className="pb-1.5 text-[14px] font-semibold text-primary hover:underline"
              >
                Minhas apostas
              </Link>
            )}
          </div>

          <div
            role="tablist"
            className="inline-grid grid-cols-2 gap-1 rounded-[10px] bg-surface p-1"
          >
            {(
              [
                ["next", "Próximos jogos"],
                ["live", `Ao vivo (${liveCount})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-[7px] px-4 text-[14px] font-semibold transition-colors",
                  tab === k
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "live" && liveCount > 0 && <span className="live-dot" />}
                {label}
              </button>
            ))}
          </div>

          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
            <button
              type="button"
              className="chip shrink-0"
              data-active={league === "all"}
              onClick={() => setLeague("all")}
            >
              Todas
            </button>
            <button
              type="button"
              className="chip shrink-0"
              data-active={league === "brasil"}
              onClick={() => setLeague("brasil")}
            >
              Brasil
            </button>
            {LEAGUES.filter((l) => leaguesWithGames.has(l.id)).map((l) => (
              <button
                key={l.id}
                type="button"
                className="chip shrink-0"
                data-active={league === l.id}
                onClick={() => setLeague(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {q.isError && (
              <p
                role="alert"
                className="rounded-[10px] border border-destructive/40 bg-destructive/10 p-3 text-[14px]"
              >
                Não foi possível atualizar os jogos. Tentando de novo.
              </p>
            )}
            {q.isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton h-[96px] rounded-[10px]" />
              ))}
            {!q.isLoading && events.length === 0 && (
              <p className="rounded-[12px] border border-dashed border-border p-10 text-center text-[14.5px] text-muted-foreground">
                {tab === "live"
                  ? "Nenhum jogo rolando agora nessas ligas."
                  : "Nenhum jogo com essas ligas nos próximos 7 dias."}
              </p>
            )}
            {events.map((e) => (
              <EventRow
                key={`${e.league}-${e.id}`}
                event={q.isError ? { ...e, odds: null } : e}
                selected={active?.event.id === e.id ? active.pick : null}
                onPick={setSelection}
              />
            ))}
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Placar e cotações publicados pela ESPN. Apostas só antes do início do jogo.
          </p>
        </section>

        <div
          className={cn(
            "lg:sticky lg:top-[76px] lg:self-start",
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[calc(64px+env(safe-area-inset-bottom))] max-lg:z-40 max-lg:px-3 max-lg:pb-2",
            !selection && "max-lg:hidden",
          )}
        >
          <BetSlip
            selection={active}
            stale={!!selection && !active}
            onClear={() => setSelection(null)}
          />
        </div>
      </div>
    </SiteShell>
  );
}
