import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/layout/site-shell";
import { getSportsFeed, type RealMatch } from "@/lib/sports.functions";
import { placeSportsBet } from "@/lib/sports-bet.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { Trophy, Loader2, Radio, Clock, MapPin, Tv, RefreshCw, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { toast } from "sonner";

export const Route = createFileRoute("/esportes")({
  head: () => ({
    meta: [
      { title: "Esportes Ao Vivo — SANTOSBET" },
      { name: "description", content: "Jogos ao vivo, próximos jogos e odds reais — Brasileirão, Libertadores, Champions e mais." },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchFeed = useServerFn(getSportsFeed);
  const feedQ = useQuery({
    queryKey: ["sports-feed"],
    queryFn: () => fetchFeed(),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const [leagueFilter, setLeagueFilter] = useState<string | "all" | "live" | "today">("today");

  const matches = feedQ.data?.matches ?? [];
  const leagues = feedQ.data?.leagues ?? [];
  const liveCount = feedQ.data?.liveCount ?? 0;

  const isToday = (iso: string) => {
    try { return new Date(iso).toDateString() === new Date().toDateString(); } catch { return false; }
  };

  const filtered = useMemo(() => {
    if (leagueFilter === "all") return matches;
    if (leagueFilter === "live") return matches.filter((m) => m.isLive);
    if (leagueFilter === "today") return matches.filter((m) => m.isLive || isToday(m.kickoff));
    return matches.filter((m) => m.leagueSlug === leagueFilter);
  }, [matches, leagueFilter]);

  const live = filtered.filter((m) => m.isLive);
  const upcoming = filtered.filter((m) => m.status === "pre").slice(0, 60);
  const finished = filtered.filter((m) => m.status === "post").slice(0, 20);

  return (
    <SiteShell>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Trophy className="size-7 text-primary" />
              Esportes
            </h1>
            <p className="text-xs md:text-sm text-white/55 mt-1 flex items-center gap-2">
              {liveCount > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inset-0 rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-red-500" />
                    </span>
                    <span className="font-bold text-red-400">{liveCount} ao vivo agora</span>
                  </span>
                  <span className="text-white/30">·</span>
                </>
              ) : null}
              <span>Odds atualizam a cada 30s</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => feedQ.refetch()}
            disabled={feedQ.isFetching}
            className="border-white/10"
          >
            <RefreshCw className={cn("size-4 mr-2", feedQ.isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* League pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-white/10">
          <Pill active={leagueFilter === "live"} onClick={() => setLeagueFilter("live")} badge={liveCount || undefined}>
            <Radio className="size-3.5" /> Ao Vivo
          </Pill>
          <Pill active={leagueFilter === "today"} onClick={() => setLeagueFilter("today")}>
            Hoje
          </Pill>
          <Pill active={leagueFilter === "all"} onClick={() => setLeagueFilter("all")}>
            Todos
          </Pill>
          {leagues.map((l) => (
            <Pill
              key={l.slug}
              active={leagueFilter === l.slug}
              onClick={() => setLeagueFilter(l.slug)}
              badge={l.live || undefined}
              logo={l.logo}
            >
              {l.name}
            </Pill>
          ))}
        </div>

        {/* Content */}
        {feedQ.isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-white/60">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm">Carregando jogos reais...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-4">
            <Trophy className="size-12 text-primary/30 mb-3" />
            <h2 className="text-lg font-bold mb-1">Nenhum jogo encontrado</h2>
            <p className="text-white/50 text-sm">
              {leagueFilter === "live"
                ? "Sem jogos ao vivo agora — veja os jogos de hoje."
                : leagueFilter === "today"
                  ? "Sem jogos hoje — veja a programação completa."
                  : "Sem partidas nessa liga no momento."}
            </p>
            {(leagueFilter === "live" || leagueFilter === "today") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setLeagueFilter(leagueFilter === "live" ? "today" : "all")}>
                {leagueFilter === "live" ? "Ver jogos de hoje" : "Ver todos os jogos"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {live.length > 0 && (
              <Section title="Ao Vivo" accent="red" count={live.length}>
                {live.map((m) => <MatchCard key={m.id} match={m} />)}
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section title="Próximos jogos" count={upcoming.length}>
                {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
              </Section>
            )}
            {finished.length > 0 && (
              <Section title="Encerrados" count={finished.length}>
                {finished.map((m) => <MatchCard key={m.id} match={m} />)}
              </Section>
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function Pill({
  active,
  onClick,
  children,
  badge,
  logo,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
  logo?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap border transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px_hsl(var(--primary))]"
          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white",
      )}
    >
      {logo && <img src={logo} alt="" className="size-3.5 object-contain" loading="lazy" />}
      {children}
      {badge != null && (
        <span className={cn("ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black min-w-[18px]", active ? "bg-black/20" : "bg-red-500/90 text-white")}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Section({ title, count, accent, children }: { title: string; count: number; accent?: "red"; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {accent === "red" && (
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
          </span>
        )}
        <h2 className={cn("text-sm font-black uppercase tracking-wider", accent === "red" ? "text-red-400" : "text-white/70")}>{title}</h2>
        <span className="text-xs text-white/40">({count})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">{children}</div>
    </div>
  );
}

function formatKickoff(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (sameDay) return `Hoje · ${time}`;
    if (isTomorrow) return `Amanhã · ${time}`;
    return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · ${time}`;
  } catch {
    return iso;
  }
}

function MatchCard({ match }: { match: RealMatch }) {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const hasOdds = match.odds.home != null || match.odds.draw != null || match.odds.away != null;

  function bet(pick: "home" | "draw" | "away", odd: number | null) {
    if (!odd) return;
    if (!user) { open("register"); return; }
    toast.success(`Aposta registrada: ${pick === "home" ? match.homeShort : pick === "away" ? match.awayShort : "Empate"} @ ${odd.toFixed(2)}`, {
      description: "Em breve: bilhete de aposta completo.",
    });
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent hover:border-primary/30 transition-all">
      {match.isLive && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
          <span className="relative flex size-1.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full size-1.5 bg-white" />
          </span>
          AO VIVO
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {/* League + status */}
        <div className="flex items-center justify-between text-[10px] text-white/45 font-semibold uppercase tracking-wide">
          <span className="truncate flex items-center gap-1.5">
            {match.leagueLogo && <img src={match.leagueLogo} alt="" className="size-3.5 object-contain" loading="lazy" />}
            {match.league}
          </span>
          <span className={cn("flex items-center gap-1 shrink-0", match.isLive ? "text-red-400" : match.status === "post" ? "text-white/30" : "text-white/55")}>
            {match.isLive ? <Radio className="size-3" /> : <Clock className="size-3" />}
            {match.isLive ? match.statusDetail : match.status === "pre" ? formatKickoff(match.kickoff) : "Encerrado"}
          </span>
        </div>

        {/* Teams + score */}
        <div className="space-y-1.5">
          <TeamRow name={match.home} badge={match.homeBadge} score={match.homeScore} live={match.isLive} ended={match.status === "post"} winner={match.status === "post" && (match.homeScore ?? 0) > (match.awayScore ?? 0)} />
          <TeamRow name={match.away} badge={match.awayBadge} score={match.awayScore} live={match.isLive} ended={match.status === "post"} winner={match.status === "post" && (match.awayScore ?? 0) > (match.homeScore ?? 0)} />
        </div>

        {/* Venue / broadcast */}
        {(match.venue || match.broadcast) && (
          <div className="flex items-center gap-3 text-[10px] text-white/35">
            {match.venue && <span className="flex items-center gap-1 truncate"><MapPin className="size-3" />{match.venue}</span>}
            {match.broadcast && <span className="flex items-center gap-1 shrink-0"><Tv className="size-3" />{match.broadcast}</span>}
          </div>
        )}

        {/* Odds */}
        {hasOdds ? (
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <OddButton label="Casa" pick={match.homeShort} odd={match.odds.home} onClick={() => bet("home", match.odds.home)} />
            <OddButton label="Empate" pick="X" odd={match.odds.draw} onClick={() => bet("draw", match.odds.draw)} />
            <OddButton label="Fora" pick={match.awayShort} odd={match.odds.away} onClick={() => bet("away", match.odds.away)} />
          </div>
        ) : match.status === "pre" ? (
          <div className="text-center text-[10px] text-white/30 py-1.5 border border-dashed border-white/10 rounded-lg">
            Odds em breve
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TeamRow({ name, badge, score, live, ended, winner }: { name: string; badge: string | null; score: number | null; live: boolean; ended: boolean; winner: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {badge ? (
          <img src={badge} alt={name} className="size-6 object-contain shrink-0" loading="lazy" />
        ) : (
          <div className="size-6 rounded-full bg-white/10 shrink-0" />
        )}
        <span className={cn("text-sm font-bold truncate", ended && !winner ? "text-white/45" : "text-white")}>{name}</span>
      </div>
      {score != null && (
        <span className={cn("text-lg font-black tabular-nums shrink-0 px-2", live ? "text-red-400" : ended && winner ? "text-primary" : "text-white/80")}>
          {score}
        </span>
      )}
    </div>
  );
}

function OddButton({ label, pick, odd, onClick }: { label: string; pick: string; odd: number | null; onClick: () => void }) {
  if (odd == null) {
    return <div className="rounded-lg bg-white/3 border border-white/5 py-2 text-center text-[10px] text-white/25">—</div>;
  }
  return (
    <button
      onClick={onClick}
      className="group/odd rounded-lg bg-white/5 border border-white/10 py-1.5 px-2 text-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all active:scale-95"
    >
      <div className="text-[9px] uppercase font-bold opacity-50 group-hover/odd:opacity-100 truncate">{label}</div>
      <div className="text-sm font-black tabular-nums">{odd.toFixed(2)}</div>
    </button>
  );
}
