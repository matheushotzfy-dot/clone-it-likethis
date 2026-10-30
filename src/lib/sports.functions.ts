import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Ligas suportadas (ESPN public scoreboard). */
export const LEAGUES = [
  { id: "fifa.world", sport: "soccer", label: "Copa do Mundo" },
  { id: "bra.1", sport: "soccer", label: "Brasileirão" },
  { id: "conmebol.libertadores", sport: "soccer", label: "Libertadores" },
  { id: "uefa.champions", sport: "soccer", label: "Champions League" },
  { id: "eng.1", sport: "soccer", label: "Premier League" },
  { id: "esp.1", sport: "soccer", label: "La Liga" },
  { id: "bra.2", sport: "soccer", label: "Série B" },
  { id: "bra.copa_do_brazil", sport: "soccer", label: "Copa do Brasil" },
  { id: "conmebol.sudamericana", sport: "soccer", label: "Sul-Americana" },
  { id: "ita.1", sport: "soccer", label: "Serie A" },
  { id: "ger.1", sport: "soccer", label: "Bundesliga" },
  { id: "fra.1", sport: "soccer", label: "Ligue 1" },
  { id: "uefa.europa", sport: "soccer", label: "Europa League" },
  { id: "nba", sport: "basketball", label: "NBA" },
] as const;

export type SportEvent = {
  id: string;
  league: string;
  leagueLabel: string;
  sport: string;
  start: string;
  state: "pre" | "in" | "post";
  clock: string;
  home: { name: string; logo?: string; score?: string };
  away: { name: string; logo?: string; score?: string };
  /** Odds decimais 1 / X / 2; null quando a fonte não fornece. */
  odds: { home: number; draw: number | null; away: number } | null;
};

/** Converte moneyline americana em odd decimal. */
function mlToDecimal(ml: unknown): number | null {
  const n = typeof ml === "number" ? ml : Number(ml);
  if (!Number.isFinite(n) || n === 0) return null;
  const d = n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
  return Math.round(d * 100) / 100;
}

type EspnTeam = { homeAway: string; score?: string; team?: { displayName?: string; logo?: string } };

async function fetchLeague(l: (typeof LEAGUES)[number]): Promise<SportEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${l.sport}/${l.id}/scoreboard`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { events?: Array<Record<string, any>> };
    return (json.events ?? []).map((e) => {
      const comp = e.competitions?.[0] ?? {};
      const teams: EspnTeam[] = comp.competitors ?? [];
      const h = teams.find((t) => t.homeAway === "home") ?? teams[0];
      const a = teams.find((t) => t.homeAway === "away") ?? teams[1];
      const o = comp.odds?.[0];
      // ESPN coloca a moneyline em odds.moneyline.<lado>.(current|close|open).odds
      const side = (k: "home" | "away" | "draw") => {
        const m = o?.moneyline?.[k];
        return mlToDecimal(m?.current?.odds ?? m?.close?.odds ?? m?.open?.odds);
      };
      const home = side("home") ?? mlToDecimal(o?.homeTeamOdds?.moneyLine);
      const away = side("away") ?? mlToDecimal(o?.awayTeamOdds?.moneyLine);
      const draw = side("draw") ?? mlToDecimal(o?.drawOdds?.moneyLine);
      return {
        id: String(e.id),
        league: l.id,
        leagueLabel: l.label,
        sport: l.sport,
        start: String(e.date),
        state: (e.status?.type?.state ?? "pre") as SportEvent["state"],
        clock: String(e.status?.type?.shortDetail ?? ""),
        home: { name: h?.team?.displayName ?? "Casa", logo: h?.team?.logo, score: h?.score },
        away: { name: a?.team?.displayName ?? "Fora", logo: a?.team?.logo, score: a?.score },
        odds: home && away ? { home, away, draw } : null,
      } satisfies SportEvent;
    });
  } catch {
    return [];
  }
}

export const getSportsEvents = createServerFn({ method: "GET" }).handler(async () => {
  const all = (await Promise.all(LEAGUES.map(fetchLeague))).flat();
  return all.filter((e) => e.state !== "post").sort((a, b) => a.start.localeCompare(b.start));
});

const betSchema = z.object({
  matchId: z.string().min(1).max(64),
  pick: z.enum(["home", "draw", "away"]),
  odd: z.number().min(1.01).max(1000),
  stake: z.number().positive().max(100000),
  description: z.string().max(200),
});

export const placeSportsBet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => betSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: balance, error } = await context.supabase.rpc("place_sports_bet", {
      p_user_id: context.userId,
      p_stake: data.stake,
      p_odd: data.odd,
      p_match_id: data.matchId,
      p_pick: data.pick,
      p_description: data.description,
    });
    if (error) throw new Error(error.message.includes("INSUFFICIENT") ? "Saldo insuficiente" : error.message);
    return { balance: Number(balance) };
  });
