import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { LEAGUES, SPORTS_POLL_MS, mapEspnEvent, validateBetQuote, type EspnEvent, type SportEvent, type League } from "./sports-data";
export { LEAGUES } from "./sports-data";
export type { SportEvent } from "./sports-data";

const scoreboardCache = new Map<string, { at: number; events: SportEvent[] }>();
const pending = new Map<string, Promise<SportEvent[]>>();
let snapshot: { at: number; events: SportEvent[] } | null = null;
let loading: Promise<SportEvent[]> | null = null;

async function fetchScoreboard(league: League, date: string, today: boolean, force = false): Promise<SportEvent[]> {
  const key = `${league.id}:${date}`;
  const cached = scoreboardCache.get(key);
  const ttl = today ? SPORTS_POLL_MS - 500 : 120_000;
  if (!force && cached && Date.now() - cached.at < ttl) return cached.events;
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const request = (async () => {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.id}/scoreboard?dates=${date}&limit=1000`;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
      if (!res.ok) { console.warn("ESPN scoreboard", league.id, date, res.status); return []; }
      const json = await res.json() as { events?: EspnEvent[] };
      const fetchedAt = new Date().toISOString();
      const events = (json.events ?? []).flatMap((e) => {
        const event = mapEspnEvent(e, league, fetchedAt);
        return event ? [event] : [];
      });
      scoreboardCache.set(key, { at: Date.now(), events });
      return events;
    } catch (error) {
      console.warn("ESPN unavailable", league.id, date, error instanceof Error ? error.name : "unknown");
      // Never keep stale prices selectable after a failed refresh.
      return (cached?.events ?? []).map((e) => ({ ...e, odds: null, oddsKind: null, oddsSource: null }));
    }
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

async function loadSportsEvents(): Promise<SportEvent[]> {
  if (snapshot && Date.now() - snapshot.at < SPORTS_POLL_MS - 500) return snapshot.events;
  if (loading) return loading;
  loading = (async () => {
    const now = new Date();
    const dates = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(now); date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10).replaceAll("-", "");
    });
    const tasks = LEAGUES.flatMap((league) => dates.map((date, i) => () => fetchScoreboard(league, date, i === 0)));
    const results: SportEvent[] = [];
    let index = 0;
    await Promise.all(Array.from({ length: 16 }, async () => {
      while (index < tasks.length) {
        const task = tasks[index++];
        if (task) results.push(...await task());
      }
    }));
    const unique = new Map<string, SportEvent>();
    const end = Date.now() + 7 * 86_400_000;
    for (const e of results) {
      if (e.state === "post" || (e.state === "pre" && (Date.parse(e.start) < Date.now() || Date.parse(e.start) > end))) continue;
      unique.set(`${e.league}:${e.id}`, e);
    }
    const events = [...unique.values()].sort((a, b) => Number(b.state === "in") - Number(a.state === "in") || a.start.localeCompare(b.start));
    snapshot = { at: Date.now(), events };
    for (const key of scoreboardCache.keys()) if (!dates.some((date) => key.endsWith(`:${date}`))) scoreboardCache.delete(key);
    return events;
  })().finally(() => { loading = null; });
  return loading;
}

export const getSportsEvents = createServerFn({ method: "GET" }).handler(loadSportsEvents);

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
    const listed = (await loadSportsEvents()).find((e) => e.id === data.matchId);
    const league = LEAGUES.find((l) => l.id === listed?.league);
    if (!listed || !league) throw new Error("Mercado indisponível. Atualize os jogos.");
    const date = listed.start.slice(0, 10).replaceAll("-", "");
    const event = (await fetchScoreboard(league, date, true, true)).find((e) => e.id === data.matchId);
    const price = validateBetQuote(event, data.pick, data.odd, Date.now());
    const { data: balance, error } = await context.supabase.rpc("place_sports_bet", {
      p_user_id: context.userId,
      p_stake: data.stake,
      p_odd: price,
      p_match_id: data.matchId,
      p_pick: data.pick,
      p_description: data.description,
    });
    if (error) throw new Error(error.message.includes("INSUFFICIENT") ? "Saldo insuficiente" : error.message);
    return { balance: Number(balance) };
  });
