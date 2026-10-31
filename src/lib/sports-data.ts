/** Shared source rules: never manufacture prices or turn closing prices into live odds. */
export const SPORTS_POLL_MS = 5_000;
export const LEAGUES = [
  { id: "bra.1", sport: "soccer", label: "Brasileirão Série A", brazil: true },
  { id: "bra.2", sport: "soccer", label: "Brasileirão Série B", brazil: true },
  { id: "bra.3", sport: "soccer", label: "Brasileirão Série C", brazil: true },
  { id: "bra.4", sport: "soccer", label: "Brasileirão Série D", brazil: true },
  { id: "bra.copa_do_brazil", sport: "soccer", label: "Copa do Brasil", brazil: true },
  { id: "fifa.world", sport: "soccer", label: "Copa do Mundo", brazil: false },
  { id: "conmebol.libertadores", sport: "soccer", label: "Libertadores", brazil: false },
  { id: "conmebol.sudamericana", sport: "soccer", label: "Sul-Americana", brazil: false },
  { id: "uefa.champions", sport: "soccer", label: "Champions League", brazil: false },
  { id: "eng.1", sport: "soccer", label: "Premier League", brazil: false },
  { id: "esp.1", sport: "soccer", label: "La Liga", brazil: false },
  { id: "ita.1", sport: "soccer", label: "Serie A Itália", brazil: false },
  { id: "ger.1", sport: "soccer", label: "Bundesliga", brazil: false },
  { id: "fra.1", sport: "soccer", label: "Ligue 1", brazil: false },
  { id: "uefa.europa", sport: "soccer", label: "Europa League", brazil: false },
  { id: "nba", sport: "basketball", label: "NBA", brazil: false },
] as const;

export type League = { id: string; sport: string; label: string; brazil: boolean };
export type SportEvent = {
  id: string; league: string; leagueLabel: string; sport: string; start: string;
  state: "pre" | "in" | "post"; clock: string;
  home: { name: string; logo?: string; score?: string };
  away: { name: string; logo?: string; score?: string };
  odds: { home: number; draw: number | null; away: number } | null;
  oddsSource: string | null;
  oddsKind: "pre" | "live" | null;
  fetchedAt: string;
};
type Price = { odds?: number | string };
type MoneylineSide = { current?: Price; close?: Price; open?: Price };
export type EspnOdds = {
  provider?: { name?: string };
  moneyline?: { home?: MoneylineSide; away?: MoneylineSide; draw?: MoneylineSide };
  homeTeamOdds?: { moneyLine?: number }; awayTeamOdds?: { moneyLine?: number }; drawOdds?: { moneyLine?: number };
};
type EspnTeam = { homeAway?: string; score?: string; team?: { displayName?: string; logo?: string } };
export type EspnEvent = {
  id?: string; date?: string; status?: { type?: { state?: string; shortDetail?: string } };
  competitions?: Array<{ competitors?: EspnTeam[]; odds?: EspnOdds[] }>;
};

export function mlToDecimal(ml: unknown): number | null {
  if (typeof ml !== "number" && typeof ml !== "string") return null;
  const n = Number(ml);
  if (!Number.isFinite(n) || Math.abs(n) < 100) return null;
  return Math.round((n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n)) * 100) / 100;
}

export function readOdds(o: EspnOdds | undefined, live: boolean): SportEvent["odds"] {
  if (!o) return null;
  // ESPN scoreboard does not identify these prices as an in-play market.
  // Even a "current" field is not proof of live pricing: suspend in-play bets.
  if (live) return null;
  const side = (key: "home" | "away" | "draw") => {
    const m = o.moneyline?.[key];
    const legacy = key === "home" ? o.homeTeamOdds?.moneyLine : key === "away" ? o.awayTeamOdds?.moneyLine : o.drawOdds?.moneyLine;
    return mlToDecimal(m?.current?.odds ?? m?.close?.odds ?? m?.open?.odds ?? legacy);
  };
  const home = side("home"), away = side("away"), draw = side("draw");
  return home !== null && away !== null ? { home, away, draw } : null;
}

export function mapEspnEvent(e: EspnEvent, league: League, fetchedAt: string): SportEvent | null {
  const state = e.status?.type?.state;
  const comp = e.competitions?.[0];
  const h = comp?.competitors?.find((t) => t.homeAway === "home");
  const a = comp?.competitors?.find((t) => t.homeAway === "away");
  if (!e.id || !e.date || !Number.isFinite(Date.parse(e.date)) || !h?.team?.displayName || !a?.team?.displayName || !["pre", "in", "post"].includes(state ?? "")) return null;
  const source = comp?.odds?.find((o) => readOdds(o, false) !== null);
  const odds = readOdds(source, state === "in");
  return {
    id: e.id, league: league.id, leagueLabel: league.label, sport: league.sport, start: e.date,
    state: state as SportEvent["state"], clock: e.status?.type?.shortDetail ?? "",
    home: { name: h.team.displayName, logo: h.team.logo, score: h.score },
    away: { name: a.team.displayName, logo: a.team.logo, score: a.score },
    odds, oddsSource: odds ? source?.provider?.name ?? "ESPN" : null, oddsKind: odds ? "pre" : null, fetchedAt,
  };
}