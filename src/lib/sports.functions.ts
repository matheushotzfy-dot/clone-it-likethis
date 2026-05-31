import { createServerFn } from "@tanstack/react-start";

// Real fixtures via TheSportsDB free API (key "3"). No auth needed.
// We pull today + next 2 days for Soccer and shape a clean payload.

export interface RealMatch {
  id: string;
  league: string;
  leagueBadge: string | null;
  country: string;
  home: string;
  away: string;
  homeBadge: string | null;
  awayBadge: string | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string; // ISO UTC
  dateKey: string; // YYYY-MM-DD (UTC)
  status: string; // NS, 1H, HT, 2H, FT, etc
  isLive: boolean;
  venue: string | null;
  odds: { home: number; draw: number; away: number };
}

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "P", "BT", "LIVE"]);

// Deterministic pseudo-random for synthetic odds (consistent per match)
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function makeOdds(id: string): { home: number; draw: number; away: number } {
  const r = seeded(id);
  const homeAdv = 0.05 + r * 0.15; // 0.05–0.20
  const drawP = 0.22 + seeded(id + "d") * 0.08;
  const homeP = 0.3 + homeAdv;
  const awayP = 1 - homeP - drawP;
  const margin = 1.08;
  return {
    home: Math.max(1.1, Math.round((1 / (homeP * margin)) * 100) / 100),
    draw: Math.max(1.1, Math.round((1 / (drawP * margin)) * 100) / 100),
    away: Math.max(1.1, Math.round((1 / (Math.max(awayP, 0.1) * margin)) * 100) / 100),
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const getSportsFeed = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  const days = [0, 1, 2, 3].map((offset) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return isoDate(d);
  });

  const all: RealMatch[] = [];
  await Promise.all(
    days.map(async (date) => {
      try {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&s=Soccer`,
          { headers: { "User-Agent": "Mozilla/5.0" } },
        );
        if (!res.ok) return;
        const json: any = await res.json();
        const events: any[] = json?.events ?? [];
        for (const e of events) {
          const ts = e.strTimestamp ? `${e.strTimestamp}Z`.replace(/ZZ$/, "Z") : `${e.dateEvent}T${e.strTime || "00:00:00"}Z`;
          const id = String(e.idEvent);
          const status = e.strStatus || "NS";
          all.push({
            id,
            league: e.strLeague ?? "Soccer",
            leagueBadge: e.strLeagueBadge ?? null,
            country: e.strCountry ?? "",
            home: e.strHomeTeam ?? "Home",
            away: e.strAwayTeam ?? "Away",
            homeBadge: e.strHomeTeamBadge ?? null,
            awayBadge: e.strAwayTeamBadge ?? null,
            homeScore: e.intHomeScore != null && e.intHomeScore !== "" ? Number(e.intHomeScore) : null,
            awayScore: e.intAwayScore != null && e.intAwayScore !== "" ? Number(e.intAwayScore) : null,
            kickoff: ts,
            dateKey: e.dateEvent ?? date,
            status,
            isLive: LIVE_STATUSES.has(status),
            venue: e.strVenue ?? null,
            odds: makeOdds(id),
          });
        }
      } catch (err) {
        console.error("sports feed fetch failed for", date, err);
      }
    }),
  );

  // Sort by kickoff
  all.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  // Build league list (unique by name) for filter pills
  const leaguesMap = new Map<string, { name: string; badge: string | null; country: string; count: number }>();
  for (const m of all) {
    const cur = leaguesMap.get(m.league) ?? { name: m.league, badge: m.leagueBadge, country: m.country, count: 0 };
    cur.count += 1;
    if (!cur.badge && m.leagueBadge) cur.badge = m.leagueBadge;
    leaguesMap.set(m.league, cur);
  }
  const leagues = [...leaguesMap.values()].sort((a, b) => b.count - a.count).slice(0, 30);

  return {
    matches: all,
    leagues,
    generatedAt: new Date().toISOString(),
  };
});
