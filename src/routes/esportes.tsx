import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { useMemo, useState } from "react";
import { LEAGUES, getAllMatches, formatKickoff, type Match } from "@/lib/sports-data";
import { cn } from "@/lib/utils";
import { Trophy, Star, Plus, X, Receipt, TrendingUp, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/esportes")({
  head: () => ({ meta: [{ title: "Esportes — PIXBET" }] }),
  component: Page,
});

type Pick = {
  matchId: string;
  matchLabel: string;
  market: "home" | "draw" | "away";
  marketLabel: string;
  odd: number;
};

function Page() {
  const [activeLeague, setActiveLeague] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState(10);
  const [slipOpen, setSlipOpen] = useState(false);

  const allMatches = useMemo(() => getAllMatches(), []);

  const filtered = useMemo(() => {
    let list = allMatches;
    if (activeLeague !== "all") list = list.filter((m) => m.leagueId === activeLeague);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.home.name.toLowerCase().includes(q) ||
          m.away.name.toLowerCase().includes(q) ||
          m.leagueName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allMatches, activeLeague, search]);

  // Group by date
  const grouped = useMemo(() => {
    const g: Record<string, Match[]> = {};
    filtered.forEach((m) => {
      const d = new Date(m.kickoff).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
      (g[d] ??= []).push(m);
    });
    return g;
  }, [filtered]);

  function togglePick(match: Match, market: Pick["market"]) {
    const odd = match.odds[market];
    const marketLabel =
      market === "home" ? match.home.name : market === "away" ? match.away.name : "Empate";
    setPicks((cur) => {
      const existing = cur.find((p) => p.matchId === match.id);
      if (existing && existing.market === market) {
        return cur.filter((p) => p.matchId !== match.id);
      }
      const next = cur.filter((p) => p.matchId !== match.id);
      next.push({
        matchId: match.id,
        matchLabel: `${match.home.name} vs ${match.away.name}`,
        market,
        marketLabel,
        odd,
      });
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
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Trophy className="size-7 text-primary" /> Esportes
            </h1>
            <p className="text-xs text-white/50 mt-1">Apostas esportivas com odds atualizadas</p>
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

        {/* League pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
          <button
            onClick={() => setActiveLeague("all")}
            className={cn(
              "shrink-0 h-10 px-4 rounded-full text-xs font-bold uppercase tracking-wide border-2 transition-all",
              activeLeague === "all"
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-popover border-white/10 text-white/70 hover:border-primary/50",
            )}
          >
            ⭐ Todos
          </button>
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLeague(l.id)}
              className={cn(
                "shrink-0 h-10 px-4 rounded-full text-xs font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap",
                activeLeague === l.id
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-popover border-white/10 text-white/70 hover:border-primary/50",
              )}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          {/* Matches list */}
          <div className="space-y-6">
            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-20 text-white/50">
                <Trophy className="size-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum jogo encontrado</p>
              </div>
            )}
            {Object.entries(grouped).map(([date, matches]) => (
              <section key={date}>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3 px-1">
                  {date}
                </h3>
                <div className="space-y-2">
                  {matches.map((m) => {
                    const { time } = formatKickoff(m.kickoff);
                    const pick = picks.find((p) => p.matchId === m.id);
                    return (
                      <div
                        key={m.id}
                        className="bg-popover border border-white/10 rounded-xl p-3 md:p-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-3 text-[10px] text-white/50 uppercase font-bold tracking-wider">
                          <span>{m.leagueFlag}</span>
                          <span>{m.leagueName}</span>
                          <span className="ml-auto text-primary">{time}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                          {/* Teams */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{m.home.flag}</span>
                              <span className="font-bold text-sm md:text-base">{m.home.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{m.away.flag}</span>
                              <span className="font-bold text-sm md:text-base">{m.away.name}</span>
                            </div>
                          </div>

                          {/* Odds */}
                          <div className="grid grid-cols-3 gap-1.5 md:gap-2 md:min-w-[300px]">
                            {(["home", "draw", "away"] as const).map((mk) => {
                              const odd = m.odds[mk];
                              const label = mk === "home" ? "1" : mk === "draw" ? "X" : "2";
                              const active = pick?.market === mk;
                              return (
                                <button
                                  key={mk}
                                  onClick={() => togglePick(m, mk)}
                                  className={cn(
                                    "h-12 rounded-lg border-2 font-black text-sm transition-all flex flex-col items-center justify-center gap-0.5",
                                    active
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "bg-surface border-white/5 text-white hover:border-primary/50",
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
                            <TrendingUp className="size-3" /> +{m.extraMarkets} mercados
                          </span>
                          <button className="hover:text-primary">
                            <Star className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Bet slip — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 bg-popover border border-white/10 rounded-2xl overflow-hidden">
              <BetSlip
                picks={picks}
                stake={stake}
                setStake={setStake}
                totalOdd={totalOdd}
                potential={potential}
                onRemove={(id) => setPicks((p) => p.filter((x) => x.matchId !== id))}
                onClear={() => setPicks([])}
                onPlace={placeBet}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bet slip button */}
      {picks.length > 0 && (
        <button
          onClick={() => setSlipOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 h-14 px-5 rounded-full bg-primary text-primary-foreground font-black shadow-2xl flex items-center gap-2"
        >
          <Receipt className="size-5" />
          {picks.length}
        </button>
      )}

      {/* Mobile bet slip sheet */}
      {slipOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 flex items-end"
          onClick={() => setSlipOpen(false)}
        >
          <div
            className="bg-popover border-t border-white/10 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <BetSlip
              picks={picks}
              stake={stake}
              setStake={setStake}
              totalOdd={totalOdd}
              potential={potential}
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

function BetSlip({
  picks,
  stake,
  setStake,
  totalOdd,
  potential,
  onRemove,
  onClear,
  onPlace,
}: {
  picks: Pick[];
  stake: number;
  setStake: (n: number) => void;
  totalOdd: number;
  potential: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPlace: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-primary" />
          <span className="font-black uppercase tracking-wider text-sm">Cupom de Aposta</span>
          {picks.length > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-black size-5 rounded-full flex items-center justify-center">
              {picks.length}
            </span>
          )}
        </div>
        {picks.length > 0 && (
          <button onClick={onClear} className="text-[11px] text-white/50 hover:text-destructive font-bold uppercase">
            Limpar
          </button>
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
                  <div className="text-right">
                    <p className="font-black text-primary">{p.odd.toFixed(2)}</p>
                  </div>
                  <button onClick={() => onRemove(p.matchId)} className="text-white/40 hover:text-destructive">
                    <X className="size-4" />
                  </button>
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
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={stake || ""}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-full h-12 pl-10 pr-3 rounded-lg bg-surface border-2 border-white/10 text-white font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 25, 50, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setStake(v)}
                    className={cn(
                      "h-9 rounded-md text-xs font-bold border transition-colors",
                      stake === v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 text-white/60 hover:border-white/30",
                    )}
                  >
                    R$ {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-xs text-white/60">Retorno Potencial</span>
              <span className="font-black text-lg text-primary">
                R$ {potential.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onPlace}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase text-sm tracking-wider hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Apostar R$ {stake.toFixed(2)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
