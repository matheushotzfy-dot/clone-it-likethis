import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSportsFeed, type RealMatch } from "@/lib/sports.functions";
import { cn } from "@/lib/utils";
import { Trophy, Star, Plus, X, Receipt, TrendingUp, Search, Radio, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useRequireAccess } from "@/hooks/use-game-access";


export const Route = createFileRoute("/esportes")({
  head: () => ({ meta: [{ title: "Esportes — SANTOSBET" }] }),
  component: Page,
});

type Pick = {
  matchId: string;
  matchLabel: string;
  market: "home" | "draw" | "away";
  marketLabel: string;
  odd: number;
};

type Tab = "live" | "today" | "tomorrow" | "upcoming";

function Page() {
  const { allowed, loading } = useRequireAccess();
  if (loading || !allowed) {
    return (
      <SiteShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </SiteShell>
    );
  }
  return <SportsBody />;
}




function SportsBody() {
  const [tab, setTab] = useState<Tab>("today");
  const [activeLeague, setActiveLeague] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState(10);
  const [slipOpen, setSlipOpen] = useState(false);

  const fetchFeed = useServerFn(getSportsFeed);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sports-feed"],
    queryFn: () => fetchFeed(),
    refetchInterval: 60_000, // refresh every minute for live scores
    staleTime: 30_000,
  });

  // Refresh live tab more aggressively
  useEffect(() => {
    if (tab !== "live") return;
    const i = setInterval(() => refetch(), 20_000);
    return () => clearInterval(i);
  }, [tab, refetch]);

  const allMatches: RealMatch[] = data?.matches ?? [];
  const leagues = data?.leagues ?? [];

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowKey = useMemo(() => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const filtered = useMemo(() => {
    let list = allMatches;
    if (tab === "live") list = list.filter((m) => m.isLive);
    else if (tab === "today") list = list.filter((m) => m.dateKey === todayKey);
    else if (tab === "tomorrow") list = list.filter((m) => m.dateKey === tomorrowKey);
    else list = list.filter((m) => m.dateKey > tomorrowKey);

    if (activeLeague !== "all") list = list.filter((m) => m.league === activeLeague);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.home.toLowerCase().includes(q) ||
          m.away.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allMatches, tab, activeLeague, search, todayKey, tomorrowKey]);

  const liveCount = allMatches.filter((m) => m.isLive).length;
  const todayCount = allMatches.filter((m) => m.dateKey === todayKey).length;
  const tomorrowCount = allMatches.filter((m) => m.dateKey === tomorrowKey).length;
  const upcomingCount = allMatches.filter((m) => m.dateKey > tomorrowKey).length;

  // Group by league for nice rendering
  const grouped = useMemo(() => {
    const g: Record<string, RealMatch[]> = {};
    filtered.forEach((m) => { (g[m.league] ??= []).push(m); });
    return g;
  }, [filtered]);

  function togglePick(match: RealMatch, market: Pick["market"]) {
    const odd = match.odds[market];
    const marketLabel = market === "home" ? match.home : market === "away" ? match.away : "Empate";
    setPicks((cur) => {
      const existing = cur.find((p) => p.matchId === match.id);
      if (existing && existing.market === market) return cur.filter((p) => p.matchId !== match.id);
      const next = cur.filter((p) => p.matchId !== match.id);
      next.push({ matchId: match.id, matchLabel: `${match.home} vs ${match.away}`, market, marketLabel, odd });
      return next;
    });
  }

  const totalOdd = picks.reduce((acc, p) => acc * p.odd, 1);
  const potential = stake * totalOdd;

  function placeBet() {
    if (picks.length === 0) return toast.error("Adicione pelo menos um palpite");
    if (stake < 1) return toast.error("Aposta mínima R$ 1,00");
    toast.success(`Aposta de R$ ${stake.toFixed(2)} realizada! Potencial: R$ ${potential.toFixed(2)}`);
    setPicks([]);
    setSlipOpen(false);
  }

  return (
    <SiteShell>
      <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Trophy className="size-7 text-primary" /> Esportes
            </h1>
            <p className="text-xs text-white/50 mt-1">Jogos reais · futebol mundial · odds atualizadas</p>
          </div>
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar time, liga..."
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-popover border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary text-sm"
            />
          </div>
        </div>

        {/* Tabs Live / Today / Tomorrow / Upcoming */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          <TabBtn active={tab === "live"} onClick={() => setTab("live")}>
            <Radio className={cn("size-4", tab === "live" || liveCount > 0 ? "text-red-500 animate-pulse" : "")} />
            Ao Vivo {liveCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">{liveCount}</span>}
          </TabBtn>
          <TabBtn active={tab === "today"} onClick={() => setTab("today")}>
            <Calendar className="size-4" /> Hoje <span className="opacity-60">({todayCount})</span>
          </TabBtn>
          <TabBtn active={tab === "tomorrow"} onClick={() => setTab("tomorrow")}>
            Amanhã <span className="opacity-60">({tomorrowCount})</span>
          </TabBtn>
          <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
            Próximos <span className="opacity-60">({upcomingCount})</span>
          </TabBtn>
        </div>

        {/* League pills */}
        {leagues.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
            <button
              onClick={() => setActiveLeague("all")}
              className={cn(
                "shrink-0 h-9 px-3 rounded-full text-xs font-bold uppercase tracking-wide border transition-all",
                activeLeague === "all" ? "bg-primary border-primary text-primary-foreground" : "bg-popover border-white/10 text-white/70 hover:border-primary/50",
              )}
            >⭐ Todas</button>
            {leagues.map((l) => (
              <button
                key={l.name}
                onClick={() => setActiveLeague(l.name)}
                className={cn(
                  "shrink-0 h-9 px-3 rounded-full text-xs font-bold tracking-wide border transition-all whitespace-nowrap flex items-center gap-2",
                  activeLeague === l.name ? "bg-primary border-primary text-primary-foreground" : "bg-popover border-white/10 text-white/70 hover:border-primary/50",
                )}
              >
                {l.badge && <img src={l.badge} alt="" className="size-4 rounded-sm object-contain" loading="lazy" />}
                {l.name}
                <span className="opacity-50">{l.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-20 text-white/50">
                <div className="size-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="mt-3 text-sm">Carregando jogos reais...</p>
              </div>
            )}
            {!isLoading && Object.keys(grouped).length === 0 && (
              <div className="text-center py-20 text-white/50">
                <Trophy className="size-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum jogo encontrado nesta seção</p>
              </div>
            )}
            {Object.entries(grouped).map(([leagueName, matches]) => (
              <section key={leagueName}>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                  {matches[0].leagueBadge && <img src={matches[0].leagueBadge} alt="" className="size-5 rounded object-contain" loading="lazy" />}
                  {leagueName}
                  {matches[0].country && <span className="text-white/40 font-bold normal-case">· {matches[0].country}</span>}
                </h3>
                <div className="space-y-2">
                  {matches.map((m) => {
                    const pick = picks.find((p) => p.matchId === m.id);
                    const time = new Date(m.kickoff).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
                    return (
                      <div key={m.id} className={cn(
                        "bg-popover border rounded-xl p-3 md:p-4 transition-colors",
                        m.isLive ? "border-red-500/40" : "border-white/10 hover:border-primary/30",
                      )}>
                        <div className="flex items-center gap-2 mb-3 text-[10px] uppercase font-bold tracking-wider">
                          {m.isLive ? (
                            <span className="flex items-center gap-1 text-red-500">
                              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" /> AO VIVO · {m.status}
                            </span>
                          ) : (
                            <span className="text-white/50">{time}</span>
                          )}
                          {m.venue && <span className="ml-auto text-white/30 normal-case font-medium truncate max-w-[200px]">{m.venue}</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.homeBadge ? <img src={m.homeBadge} alt="" className="size-6 object-contain shrink-0" loading="lazy" /> : <span className="size-6 rounded-full bg-white/10 shrink-0" />}
                                <span className="font-bold text-sm md:text-base truncate">{m.home}</span>
                              </div>
                              {m.homeScore != null && <span className="font-black text-lg text-primary shrink-0">{m.homeScore}</span>}
                            </div>
                            <div className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.awayBadge ? <img src={m.awayBadge} alt="" className="size-6 object-contain shrink-0" loading="lazy" /> : <span className="size-6 rounded-full bg-white/10 shrink-0" />}
                                <span className="font-bold text-sm md:text-base truncate">{m.away}</span>
                              </div>
                              {m.awayScore != null && <span className="font-black text-lg text-primary shrink-0">{m.awayScore}</span>}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 md:gap-2 md:min-w-[300px]">
                            {(["home", "draw", "away"] as const).map((mk) => {
                              const odd = m.odds[mk];
                              const label = mk === "home" ? "1" : mk === "draw" ? "X" : "2";
                              const active = pick?.market === mk;
                              const disabled = m.status === "FT" || m.status === "AET" || m.status === "PEN";
                              return (
                                <button
                                  key={mk}
                                  disabled={disabled}
                                  onClick={() => togglePick(m, mk)}
                                  className={cn(
                                    "h-12 rounded-lg border-2 font-black text-sm transition-all flex flex-col items-center justify-center gap-0.5",
                                    disabled ? "opacity-30 cursor-not-allowed border-white/5 bg-surface" :
                                    active ? "bg-primary border-primary text-primary-foreground" :
                                    "bg-surface border-white/5 text-white hover:border-primary/50",
                                  )}
                                >
                                  <span className="text-[10px] opacity-60 font-bold">{label}</span>
                                  <span>{odd.toFixed(2)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[11px] text-white/50">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="size-3" /> Mais mercados em breve
                          </span>
                          <button className="hover:text-primary"><Star className="size-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20 bg-popover border border-white/10 rounded-2xl overflow-hidden">
              <BetSlip
                picks={picks} stake={stake} setStake={setStake} totalOdd={totalOdd} potential={potential}
                onRemove={(id) => setPicks((p) => p.filter((x) => x.matchId !== id))}
                onClear={() => setPicks([])}
                onPlace={placeBet}
              />
            </div>
          </aside>
        </div>
      </div>

      {picks.length > 0 && (
        <button
          onClick={() => setSlipOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 h-14 px-5 rounded-full bg-primary text-primary-foreground font-black shadow-2xl flex items-center gap-2"
        >
          <Receipt className="size-5" />{picks.length}
        </button>
      )}

      {slipOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setSlipOpen(false)}>
          <div className="bg-popover border-t border-white/10 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <BetSlip
              picks={picks} stake={stake} setStake={setStake} totalOdd={totalOdd} potential={potential}
              onRemove={(id) => setPicks((p) => p.filter((x) => x.matchId !== id))}
              onClear={() => setPicks([])}
              onPlace={placeBet}
            />
          </div>
        </div>
      )}
    </SiteShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 h-10 px-4 rounded-xl text-sm font-black uppercase tracking-wide border-2 transition-all flex items-center gap-2",
        active ? "bg-primary border-primary text-primary-foreground" : "bg-popover border-white/10 text-white/70 hover:border-primary/50",
      )}
    >{children}</button>
  );
}

function BetSlip({ picks, stake, setStake, totalOdd, potential, onRemove, onClear, onPlace }: {
  picks: Pick[]; stake: number; setStake: (n: number) => void; totalOdd: number; potential: number;
  onRemove: (id: string) => void; onClear: () => void; onPlace: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-primary" />
          <span className="font-black uppercase tracking-wider text-sm">Cupom de Aposta</span>
          {picks.length > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-black size-5 rounded-full flex items-center justify-center">{picks.length}</span>
          )}
        </div>
        {picks.length > 0 && (
          <button onClick={onClear} className="text-[11px] text-white/50 hover:text-destructive font-bold uppercase">Limpar</button>
        )}
      </div>

      {picks.length === 0 ? (
        <div className="px-5 py-12 text-center text-white/50">
          <Plus className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione odds para começar</p>
        </div>
      ) : (
        <>
          <div className="px-3 py-3 space-y-2 max-h-[40vh] overflow-y-auto">
            {picks.map((p) => (
              <div key={p.matchId} className="bg-surface rounded-lg p-3 border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/50 truncate">{p.matchLabel}</p>
                    <p className="text-sm font-bold mt-0.5">{p.marketLabel}</p>
                  </div>
                  <div className="text-right"><p className="font-black text-primary">{p.odd.toFixed(2)}</p></div>
                  <button onClick={() => onRemove(p.matchId)} className="text-white/40 hover:text-destructive"><X className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-white/10 space-y-3 bg-surface/50">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Odd Total</span>
              <span className="font-black text-primary">{totalOdd.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Valor da Aposta</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 font-bold text-sm">R$</span>
                <input
                  type="number" inputMode="decimal" min={1} value={stake || ""}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-full h-12 pl-10 pr-3 rounded-lg bg-surface border-2 border-white/10 text-white font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 25, 50, 100].map((v) => (
                  <button key={v} onClick={() => setStake(v)}
                    className={cn("h-9 rounded-md text-xs font-bold border transition-colors",
                      stake === v ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-white/60 hover:border-white/30",
                    )}>R$ {v}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-xs text-white/60">Retorno Potencial</span>
              <span className="font-black text-lg text-primary">R$ {potential.toFixed(2)}</span>
            </div>
            <button onClick={onPlace}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase text-sm tracking-wider hover:brightness-110 active:scale-[0.98] transition-all">
              Apostar R$ {stake.toFixed(2)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
