import { createServerFn } from "@tanstack/react-start";

// Real live fixtures + odds via ESPN's public scoreboard API. No auth needed.
// Odds come from DraftKings (when available) in American format and are
// converted to decimal (Brazilian style).

export interface RealOdds {
  home: number | null;
  draw: number | null;
  away: number | null;
  provider?: string;
}

export interface RealMatch {
  id: string;
  league: string;
  leagueSlug: string;
  leagueLogo: string | null;
  sport: "soccer" | "basketball";
  home: string;
  homeShort: string;
  away: string;
  awayShort: string;
  homeBadge: string | null;
  awayBadge: string | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string; // ISO UTC
  status: string; // pre | in | post
  statusDetail: string; // "Scheduled", "45'", "Half Time", "Full Time", etc
  isLive: boolean;
  venue: string | null;
  odds: RealOdds;
  broadcast: string | null;
}

interface LeagueDef {
  sport: "soccer" | "basketball";
  slug: string;
  label: string;
}

const LEAGUES: LeagueDef[] = [
  { sport: "soccer", slug: "fifa.world", label: "Copa do Mundo FIFA" },
  { sport: "soccer", slug: "fifa.cwc", label: "Mundial de Clubes" },
  { sport: "soccer", slug: "fifa.worldq.conmebol", label: "Eliminatórias CONMEBOL" },
  { sport: "soccer", slug: "bra.1", label: "Brasileirão Série A" },
  { sport: "soccer", slug: "bra.2", label: "Brasileirão Série B" },
  { sport: "soccer", slug: "bra.copa_do_brazil", label: "Copa do Brasil" },
  { sport: "soccer", slug: "conmebol.libertadores", label: "Libertadores" },
  { sport: "soccer", slug: "conmebol.sudamericana", label: "Sul-Americana" },
  { sport: "soccer", slug: "eng.1", label: "Premier League" },
  { sport: "soccer", slug: "esp.1", label: "LaLiga" },
  { sport: "soccer", slug: "ita.1", label: "Serie A (Itália)" },
  { sport: "soccer", slug: "ger.1", label: "Bundesliga" },
  { sport: "soccer", slug: "fra.1", label: "Ligue 1" },
  { sport: "soccer", slug: "uefa.champions", label: "Champions League" },
  { sport: "soccer", slug: "uefa.europa", label: "Europa League" },
  { sport: "basketball", slug: "nba", label: "NBA" },
];

function americanToDecimal(odds: string | number | undefined | null): number | null {
  if (odds == null || odds === "") return null;
  const n = typeof odds === "number" ? odds : Number(String(odds).replace(/[^0-9-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  const dec = n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
  return Math.round(dec * 100) / 100;
}

function parseOdds(rawList: any[] | undefined): RealOdds {
  const empty: RealOdds = { home: null, draw: null, away: null };
  if (!rawList || !rawList.length) return empty;
  const o = rawList.find((x) => x && (x.moneyline || x.awayTeamOdds || x.homeTeamOdds));
  if (!o) return empty;
  const ml = o.moneyline;
  if (ml) {
    return {
      home: americanToDecimal(ml.home?.close?.odds ?? ml.home?.open?.odds),
      draw: americanToDecimal(ml.draw?.close?.odds ?? ml.draw?.open?.odds),
      away: americanToDecimal(ml.away?.close?.odds ?? ml.away?.open?.odds),
      provider: o.provider?.displayName ?? o.provider?.name,
    };
  }
  // Fallback: awayTeamOdds / homeTeamOdds shape
  return {
    home: americanToDecimal(o.homeTeamOdds?.moneyLine),
    draw: americanToDecimal(o.drawOdds?.moneyLine),
    away: americanToDecimal(o.awayTeamOdds?.moneyLine),
    provider: o.provider?.displayName ?? o.provider?.name,
  };
}

function statusToDetail(state: string, type: any): { detail: string; isLive: boolean } {
  const isLive = state === "in";
  const detail = type?.shortDetail ?? type?.detail ?? type?.description ?? state;
  return { detail, isLive };
}

async function fetchLeague(def: LeagueDef): Promise<RealMatch[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${def.sport}/${def.slug}/scoreboard`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const json: any = await res.json();
    const leagueLogo: string | null = json?.leagues?.[0]?.logos?.[0]?.href ?? null;
    const events: any[] = json?.events ?? [];
    return events.map((e) => {
      const c = e.competitions?.[0] ?? {};
      const competitors: any[] = c.competitors ?? [];
      const home = competitors.find((x) => x.homeAway === "home") ?? competitors[0] ?? {};
      const away = competitors.find((x) => x.homeAway === "away") ?? competitors[1] ?? {};
      const { detail, isLive } = statusToDetail(e.status?.type?.state, e.status?.type);
      return {
        id: String(e.id),
        league: def.label,
        leagueSlug: def.slug,
        leagueLogo,
        sport: def.sport,
        home: home.team?.displayName ?? "Home",
        homeShort: home.team?.abbreviation ?? home.team?.shortDisplayName ?? "HOME",
        away: away.team?.displayName ?? "Away",
        awayShort: away.team?.abbreviation ?? away.team?.shortDisplayName ?? "AWAY",
        homeBadge: home.team?.logo ?? null,
        awayBadge: away.team?.logo ?? null,
        homeScore: home.score != null && home.score !== "" ? Number(home.score) : null,
        awayScore: away.score != null && away.score !== "" ? Number(away.score) : null,
        kickoff: e.date,
        status: e.status?.type?.state ?? "pre",
        statusDetail: detail,
        isLive,
        venue: c.venue?.fullName ?? null,
        odds: parseOdds(c.odds),
        broadcast: c.broadcasts?.[0]?.names?.[0] ?? null,
      } satisfies RealMatch;
    });
  } catch (err) {
    console.error("ESPN fetch failed for", def.slug, err);
    return [];
  }
}

export const getSportsFeed = createServerFn({ method: "GET" }).handler(async () => {
  const lists = await Promise.all(LEAGUES.map(fetchLeague));
  const matches = lists.flat();

  // Sort: live first, then by kickoff
  matches.sort((a, b) => {
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
    return a.kickoff.localeCompare(b.kickoff);
  });

  // Build league summary
  const leaguesMap = new Map<
    string,
    { slug: string; name: string; logo: string | null; count: number; live: number }
  >();
  for (const m of matches) {
    const cur =
      leaguesMap.get(m.leagueSlug) ?? { slug: m.leagueSlug, name: m.league, logo: m.leagueLogo, count: 0, live: 0 };
    cur.count += 1;
    if (m.isLive) cur.live += 1;
    if (!cur.logo && m.leagueLogo) cur.logo = m.leagueLogo;
    leaguesMap.set(m.leagueSlug, cur);
  }
  const leagues = [...leaguesMap.values()].sort((a, b) => b.live - a.live || b.count - a.count);

  return {
    matches,
    leagues,
    liveCount: matches.filter((m) => m.isLive).length,
    generatedAt: new Date().toISOString(),
  };
});
