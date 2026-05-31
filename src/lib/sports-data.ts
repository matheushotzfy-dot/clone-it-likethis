// Native sports data layer. Generates realistic upcoming football matches
// with calculated odds. Designed to be swappable with a real provider API later.

export interface Team {
  name: string;
  flag: string; // emoji flag
  strength: number; // 1-100 used to compute odds
}

export interface League {
  id: string;
  name: string;
  country: string;
  flag: string;
  teams: Team[];
}

export interface Match {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueFlag: string;
  home: Team;
  away: Team;
  kickoff: string; // ISO date
  odds: { home: number; draw: number; away: number };
  extraMarkets: number; // count of extra betting markets
}

export const LEAGUES: League[] = [
  {
    id: "brasileirao-a",
    name: "Brasileirão Série A",
    country: "Brasil",
    flag: "🇧🇷",
    teams: [
      { name: "Flamengo", flag: "🔴", strength: 88 },
      { name: "Palmeiras", flag: "🟢", strength: 87 },
      { name: "São Paulo", flag: "⚪", strength: 80 },
      { name: "Corinthians", flag: "⚫", strength: 78 },
      { name: "Botafogo", flag: "⚫", strength: 82 },
      { name: "Fluminense", flag: "🟢", strength: 79 },
      { name: "Atlético-MG", flag: "⚫", strength: 81 },
      { name: "Cruzeiro", flag: "🔵", strength: 76 },
      { name: "Internacional", flag: "🔴", strength: 79 },
      { name: "Grêmio", flag: "🔵", strength: 77 },
      { name: "Bahia", flag: "🔵", strength: 72 },
      { name: "Vasco", flag: "⚫", strength: 70 },
    ],
  },
  {
    id: "brasileirao-b",
    name: "Brasileirão Série B",
    country: "Brasil",
    flag: "🇧🇷",
    teams: [
      { name: "Santos", flag: "⚪", strength: 75 },
      { name: "Sport", flag: "🔴", strength: 70 },
      { name: "Novorizontino", flag: "🟢", strength: 65 },
      { name: "Goiás", flag: "🟢", strength: 68 },
      { name: "Mirassol", flag: "🟡", strength: 64 },
      { name: "Ceará", flag: "⚫", strength: 67 },
      { name: "América-MG", flag: "🟢", strength: 66 },
      { name: "Coritiba", flag: "🟢", strength: 65 },
    ],
  },
  {
    id: "libertadores",
    name: "Copa Libertadores",
    country: "CONMEBOL",
    flag: "🏆",
    teams: [
      { name: "Boca Juniors", flag: "🔵", strength: 84 },
      { name: "River Plate", flag: "⚪", strength: 85 },
      { name: "Peñarol", flag: "🟡", strength: 76 },
      { name: "Nacional", flag: "⚪", strength: 75 },
      { name: "Olimpia", flag: "⚪", strength: 73 },
      { name: "Independiente", flag: "🔴", strength: 78 },
      { name: "LDU Quito", flag: "⚪", strength: 72 },
      { name: "Atlético Nacional", flag: "🟢", strength: 77 },
    ],
  },
  {
    id: "premier-league",
    name: "Premier League",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    teams: [
      { name: "Manchester City", flag: "🔵", strength: 93 },
      { name: "Arsenal", flag: "🔴", strength: 89 },
      { name: "Liverpool", flag: "🔴", strength: 90 },
      { name: "Chelsea", flag: "🔵", strength: 84 },
      { name: "Manchester United", flag: "🔴", strength: 82 },
      { name: "Tottenham", flag: "⚪", strength: 83 },
      { name: "Newcastle", flag: "⚫", strength: 80 },
      { name: "Aston Villa", flag: "🟣", strength: 78 },
    ],
  },
  {
    id: "la-liga",
    name: "La Liga",
    country: "Espanha",
    flag: "🇪🇸",
    teams: [
      { name: "Real Madrid", flag: "⚪", strength: 94 },
      { name: "Barcelona", flag: "🔵", strength: 91 },
      { name: "Atlético Madrid", flag: "🔴", strength: 87 },
      { name: "Real Sociedad", flag: "🔵", strength: 80 },
      { name: "Athletic Bilbao", flag: "🔴", strength: 79 },
      { name: "Villarreal", flag: "🟡", strength: 78 },
      { name: "Sevilla", flag: "⚪", strength: 77 },
      { name: "Real Betis", flag: "🟢", strength: 76 },
    ],
  },
  {
    id: "champions",
    name: "Champions League",
    country: "UEFA",
    flag: "⭐",
    teams: [
      { name: "Real Madrid", flag: "⚪", strength: 94 },
      { name: "Manchester City", flag: "🔵", strength: 93 },
      { name: "Bayern Munich", flag: "🔴", strength: 91 },
      { name: "PSG", flag: "🔵", strength: 89 },
      { name: "Inter Milan", flag: "🔵", strength: 87 },
      { name: "Borussia Dortmund", flag: "🟡", strength: 85 },
      { name: "Liverpool", flag: "🔴", strength: 90 },
      { name: "Atlético Madrid", flag: "🔴", strength: 87 },
    ],
  },
  {
    id: "serie-a-italia",
    name: "Serie A",
    country: "Itália",
    flag: "🇮🇹",
    teams: [
      { name: "Inter Milan", flag: "🔵", strength: 87 },
      { name: "Juventus", flag: "⚫", strength: 85 },
      { name: "AC Milan", flag: "🔴", strength: 84 },
      { name: "Napoli", flag: "🔵", strength: 83 },
      { name: "AS Roma", flag: "🟡", strength: 80 },
      { name: "Lazio", flag: "🔵", strength: 79 },
    ],
  },
];

// Deterministic pseudo-random based on string seed
function seedRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 100000) / 100000;
  };
}

function calcOdds(homeStr: number, awayStr: number): { home: number; draw: number; away: number } {
  // Convert strength to win probability
  const homeAdvantage = 5;
  const hP = (homeStr + homeAdvantage) / (homeStr + awayStr + homeAdvantage + 30);
  const aP = awayStr / (homeStr + awayStr + homeAdvantage + 30);
  const dP = 1 - hP - aP;
  const margin = 1.08; // bookmaker margin
  return {
    home: Math.max(1.05, Math.round((1 / (hP * margin)) * 100) / 100),
    draw: Math.max(1.05, Math.round((1 / (dP * margin)) * 100) / 100),
    away: Math.max(1.05, Math.round((1 / (aP * margin)) * 100) / 100),
  };
}

function generateMatchesForLeague(league: League, daysAhead: number, baseDate: Date): Match[] {
  const matches: Match[] = [];
  const teams = [...league.teams];
  const rnd = seedRandom(league.id + baseDate.toDateString());

  // Shuffle deterministically
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  for (let day = 0; day < daysAhead; day++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day);
    const matchCount = Math.floor(rnd() * 2) + 1; // 1-2 matches per day per league

    for (let m = 0; m < matchCount && teams.length >= 2; m++) {
      const homeIdx = Math.floor(rnd() * teams.length);
      const home = teams[homeIdx];
      const remaining = teams.filter((_, i) => i !== homeIdx);
      const away = remaining[Math.floor(rnd() * remaining.length)];

      const hour = 14 + Math.floor(rnd() * 8);
      const minute = rnd() > 0.5 ? 0 : 30;
      date.setHours(hour, minute, 0, 0);

      matches.push({
        id: `${league.id}-${day}-${m}-${home.name}-${away.name}`.replace(/\s/g, ""),
        leagueId: league.id,
        leagueName: league.name,
        leagueFlag: league.flag,
        home,
        away,
        kickoff: date.toISOString(),
        odds: calcOdds(home.strength, away.strength),
        extraMarkets: Math.floor(rnd() * 200) + 50,
      });
    }
  }

  return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export function getAllMatches(baseDate?: Date): Match[] {
  // Use a stable base date (start of today UTC) to keep SSR/client matched within the same day
  const base = baseDate ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  return LEAGUES.flatMap((l) => generateMatchesForLeague(l, 5, base)).sort((a, b) =>
    a.kickoff.localeCompare(b.kickoff),
  );
}

export function getMatchesByLeague(leagueId: string, baseDate?: Date): Match[] {
  return getAllMatches(baseDate).filter((m) => m.leagueId === leagueId);
}

export function formatKickoff(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}
