import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-guard";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  LEAGUES,
  SPORTS_POLL_MS,
  mapEspnEvent,
  validateBetQuote,
  settleMatchResult,
  type EspnEvent,
  type SportEvent,
  type League,
} from "./sports-data";
export { LEAGUES } from "./sports-data";
export type { SportEvent } from "./sports-data";

const scoreboardCache = new Map<string, { at: number; events: SportEvent[] }>();
const pending = new Map<string, Promise<SportEvent[]>>();
let snapshot: { at: number; events: SportEvent[] } | null = null;
let loading: Promise<SportEvent[]> | null = null;

async function fetchScoreboard(
  league: League,
  date: string,
  today: boolean,
  force = false,
): Promise<SportEvent[]> {
  const key = `${league.id}:${date}`;
  const cached = scoreboardCache.get(key);
  const ttl = today ? SPORTS_POLL_MS - 500 : 120_000;
  if (!force && cached && Date.now() - cached.at < ttl) return cached.events;
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const request = (async () => {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.id}/scoreboard?dates=${date}&limit=1000`;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        console.warn("ESPN scoreboard", league.id, date, res.status);
        return [];
      }
      const json = (await res.json()) as { events?: EspnEvent[] };
      const fetchedAt = new Date().toISOString();
      const events = (json.events ?? []).flatMap((e) => {
        const event = mapEspnEvent(e, league, fetchedAt);
        return event ? [event] : [];
      });
      scoreboardCache.set(key, { at: Date.now(), events });
      return events;
    } catch (error) {
      console.warn(
        "ESPN unavailable",
        league.id,
        date,
        error instanceof Error ? error.name : "unknown",
      );
      // Never keep stale prices selectable after a failed refresh.
      return (cached?.events ?? []).map((e) => ({
        ...e,
        odds: null,
        oddsKind: null,
        oddsSource: null,
      }));
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
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10).replaceAll("-", "");
    });
    const tasks = LEAGUES.flatMap((league) =>
      dates.map((date, i) => () => fetchScoreboard(league, date, i === 0)),
    );
    const results: SportEvent[] = [];
    let index = 0;
    await Promise.all(
      Array.from({ length: 16 }, async () => {
        while (index < tasks.length) {
          const task = tasks[index++];
          if (task) results.push(...(await task()));
        }
      }),
    );
    const unique = new Map<string, SportEvent>();
    const end = Date.now() + 7 * 86_400_000;
    for (const e of results) {
      if (
        e.state === "post" ||
        (e.state === "pre" && (Date.parse(e.start) < Date.now() || Date.parse(e.start) > end))
      )
        continue;
      unique.set(`${e.league}:${e.id}`, e);
    }
    const events = [...unique.values()].sort(
      (a, b) =>
        Number(b.state === "in") - Number(a.state === "in") || a.start.localeCompare(b.start),
    );
    snapshot = { at: Date.now(), events };
    for (const key of scoreboardCache.keys())
      if (!dates.some((date) => key.endsWith(`:${date}`))) scoreboardCache.delete(key);
    return events;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export const getSportsEvents = createServerFn({ method: "GET" }).handler(async () => {
  // Aproveita o tráfego da página de esportes para liquidar apostas (no máximo 1x/min).
  void maybeSettle();
  return loadSportsEvents();
});

const betSchema = z.object({
  matchId: z.string().min(1).max(64),
  pick: z.enum(["home", "draw", "away"]),
  odd: z.number().min(1.01).max(1000),
  stake: z.number().positive().max(1_000_000),
  requestId: z.string().uuid().optional(),
});

/**
 * A odd é conferida de novo na ESPN no momento da aposta; o jogador só
 * confirma o preço que viu. O débito e o registro da aposta acontecem juntos
 * no banco (place_sports_bet), que só a service role executa.
 */
export const placeSportsBet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => betSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./money.server");
    const settings = await m.loadMoneySettings();
    if (settings.maintenance_mode) throw new Error("Plataforma em manutenção.");
    if (!settings.sports_enabled)
      throw new Error("Apostas esportivas estão temporariamente indisponíveis.");
    const stake = m.roundMoney(data.stake);
    if (stake < settings.min_bet_sports)
      throw new Error(`Aposta mínima: R$ ${settings.min_bet_sports.toFixed(2)}`);
    if (stake > settings.max_bet_sports)
      throw new Error(`Aposta máxima: R$ ${settings.max_bet_sports.toFixed(2)}`);

    const listed = (await loadSportsEvents()).find((e) => e.id === data.matchId);
    const league = LEAGUES.find((l) => l.id === listed?.league);
    if (!listed || !league) throw new Error("Mercado indisponível. Atualize os jogos.");
    const date = listed.start.slice(0, 10).replaceAll("-", "");
    const event = (await fetchScoreboard(league, date, true, true)).find(
      (e) => e.id === data.matchId,
    );
    const price = validateBetQuote(event, data.pick, data.odd, Date.now());
    if (m.roundMoney(stake * price) > settings.max_payout_sports) {
      throw new Error(
        `O prêmio máximo por aposta é R$ ${settings.max_payout_sports.toFixed(2)}. Diminua o valor.`,
      );
    }

    const admin = await m.getAdminClient();
    const { data: rows, error } = await admin.rpc("place_sports_bet", {
      p_user_id: context.userId,
      p_event_id: event!.id,
      p_league: league.id,
      p_league_name: league.label,
      p_home: event!.home.name,
      p_away: event!.away.name,
      p_starts_at: event!.start,
      p_pick: data.pick,
      p_odd: price,
      p_stake: stake,
      p_request_id: data.requestId,
    });
    if (error)
      throw new Error(m.friendlyDbError(error.message, "Não foi possível registrar a aposta."));
    const row = (rows as { bet_id: string; balance: number }[] | null)?.[0];
    return {
      betId: row?.bet_id ?? null,
      balance: Number(row?.balance ?? 0),
      odd: price,
      potential: m.roundMoney(stake * price),
    };
  });

// ---------------------------------------------------------------------------
// Liquidação
// ---------------------------------------------------------------------------
let lastSettleAt = 0;
let settling: Promise<SettleReport> | null = null;

export interface SettleReport {
  checked: number;
  won: number;
  lost: number;
  void: number;
  pending: number;
  errors: number;
}

async function maybeSettle() {
  if (Date.now() - lastSettleAt < 60_000 || settling) return;
  try {
    await runSettlement();
  } catch (e) {
    console.error("sports settlement failed", e);
  }
}

/** Liquida toda aposta aberta cujo jogo já terminou (ou foi adiado/cancelado). */
export async function runSettlement(): Promise<SettleReport> {
  if (settling) return settling;
  lastSettleAt = Date.now();
  settling = (async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const report: SettleReport = { checked: 0, won: 0, lost: 0, void: 0, pending: 0, errors: 0 };
    const { data: open } = await supabaseAdmin
      .from("sports_bets")
      .select("id,event_id,league,pick,starts_at")
      .eq("status", "open")
      .lte("starts_at", new Date(Date.now() + 60 * 60_000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(500);
    if (!open?.length) return report;

    // Um placar por liga+data cobre todas as apostas daquele dia.
    const keys = new Map<string, { league: League; date: string }>();
    for (const bet of open) {
      const league = LEAGUES.find((l) => l.id === bet.league);
      if (!league || !bet.starts_at) continue;
      // ESPN agrupa pela data em UTC-? do evento; consulta o dia e o anterior por segurança.
      const start = new Date(bet.starts_at);
      for (const offset of [0, -1]) {
        const d = new Date(start.getTime() + offset * 86_400_000)
          .toISOString()
          .slice(0, 10)
          .replaceAll("-", "");
        keys.set(`${league.id}:${d}`, { league, date: d });
      }
    }
    const events = new Map<string, SportEvent>();
    for (const { league, date } of keys.values()) {
      for (const e of await fetchScoreboard(league, date, false, true))
        events.set(`${league.id}:${e.id}`, e);
    }

    for (const bet of open) {
      report.checked++;
      const event = events.get(`${bet.league}:${bet.event_id}`);
      const result = event ? settleMatchResult(event, bet.pick as "home" | "draw" | "away") : null;
      if (!result) {
        report.pending++;
        continue;
      }
      const { error } = await supabaseAdmin.rpc("settle_sports_bet", {
        p_bet_id: bet.id,
        p_status: result.status,
        p_score_home: result.scoreHome as number,
        p_score_away: result.scoreAway as number,
        p_note: result.status === "void" ? `Automático: ${result.reason}` : "Automático",
      });
      if (error) {
        report.errors++;
        console.error("settle_sports_bet", bet.id, error.message);
        continue;
      }
      report[result.status]++;
    }
    return report;
  })().finally(() => {
    settling = null;
  });
  return settling;
}

export const settleSportsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return runSettlement();
  });

/** Liquidação manual pelo admin (ex.: jogo que a ESPN não fechou). */
export const settleSportsBetManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        betId: z.string().uuid(),
        status: z.enum(["won", "lost", "void"]),
        scoreHome: z.number().int().min(0).max(999).nullable(),
        scoreAway: z.number().int().min(0).max(999).nullable(),
        note: z.string().trim().min(3).max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("settle_sports_bet", {
      p_bet_id: data.betId,
      p_status: data.status,
      p_score_home: data.scoreHome as number,
      p_score_away: data.scoreAway as number,
      p_settled_by: context.userId,
      p_note: data.note,
    });
    if (error) throw new Error(error.message);
    const { data: bet } = await supabaseAdmin
      .from("sports_bets")
      .select("user_id,stake,potential_payout,home,away")
      .eq("id", data.betId)
      .maybeSingle();
    await context.supabase.rpc("admin_log", {
      p_action: "sports_bet.settle",
      p_target_user: bet?.user_id,
      p_target_id: data.betId,
      p_details: {
        resultado: data.status,
        jogo: bet ? `${bet.home} x ${bet.away}` : null,
        amount: bet ? Number(bet.stake) : null,
        motivo: data.note,
      } as never,
    });
    return { result: result as string };
  });
