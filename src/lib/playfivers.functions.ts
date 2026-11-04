import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPFGameCategory, sortPFSectionGames } from "./pf-game-classification";

import { resolvePFEndpoint } from "./playfivers-endpoint";

interface PFProvider {
  id: number;
  name: string;
  image_url: string;
  status: number;
}
interface PFGame {
  name: string;
  image_url: string;
  rounds_free: boolean;
  status: boolean;
  original: boolean;
  game_code: string;
  provider: { name: string };
}

const CURATED_FEATURED_GAMES: PFGame[] = [
  { name: "Aviator", image_url: "https://imagensfivers.com/Games/Spribe/SPB_aviator.webp", rounds_free: false, status: true, original: false, game_code: "SPB_aviator", provider: { name: "OFICIAL - SPRIBE" } },
  { name: "Aviator", image_url: "https://imagensfivers.com/Games/Spribe/Aviator.webp", rounds_free: false, status: true, original: true, game_code: "aviator", provider: { name: "SPRIBE" } },
  { name: "Spaceman", image_url: "https://imagensfivers.com/Games/Pragmatic-Play/PP_1301.webp", rounds_free: false, status: true, original: false, game_code: "PP_1301", provider: { name: "OFICIAL - PRAGMATIC SLOTS" } },
  { name: "JETX", image_url: "https://imagensfivers.com/Games/jetx/8891.webp", rounds_free: false, status: true, original: true, game_code: "8891", provider: { name: "JETX ORIGINAL" } },
  { name: "JETX3", image_url: "https://imagensfivers.com/Games/jetx/8892.webp", rounds_free: false, status: true, original: true, game_code: "8892", provider: { name: "JETX ORIGINAL" } },
  { name: "Crash", image_url: "https://imagensfivers.com/Games/Galaxsys/Crash.webp", rounds_free: false, status: true, original: true, game_code: "12493", provider: { name: "GALAXSYS ORIGINAL" } },
  { name: "Ninja Crash", image_url: "https://imagensfivers.com/Games/Galaxsys/Ninja-Crash.webp", rounds_free: false, status: true, original: true, game_code: "12526", provider: { name: "GALAXSYS ORIGINAL" } },
  { name: "Mines", image_url: "https://imagensfivers.com/Games/Spribe/SPB_mines.webp", rounds_free: false, status: true, original: false, game_code: "SPB_mines", provider: { name: "OFICIAL - SPRIBE" } },
  { name: "Roulette", image_url: "https://imagensfivers.com/Games/Evolution-Live/GPKEVO_002f1c169f987367a76460647f4d38f5.webp", rounds_free: false, status: true, original: false, game_code: "GPKEVO_002f1c169f987367a76460647f4d38f5", provider: { name: "OFICIAL - EVOLUTION LIVE" } },
  { name: "Baccarat A", image_url: "https://imagensfivers.com/Games/Evolution-Live/GPKEVO_dbbb995447823f91946b33fc4a59ed69.webp", rounds_free: false, status: true, original: false, game_code: "GPKEVO_dbbb995447823f91946b33fc4a59ed69", provider: { name: "OFICIAL - EVOLUTION LIVE" } },
  { name: "Blackjack A", image_url: "https://imagensfivers.com/Games/Evolution-Live/GPKEVO_d44f99268a3f923142a9dbcdc3295448.webp", rounds_free: false, status: true, original: false, game_code: "GPKEVO_d44f99268a3f923142a9dbcdc3295448", provider: { name: "OFICIAL - EVOLUTION LIVE" } },
  { name: "Crazy Time", image_url: "https://imagensfivers.com/Games/Evolution-Live/GPKEVO_7d9bf93163aa8286ca8af68253fbe635.webp", rounds_free: false, status: true, original: false, game_code: "GPKEVO_7d9bf93163aa8286ca8af68253fbe635", provider: { name: "OFICIAL - EVOLUTION LIVE" } },
  { name: "Dragon Tiger", image_url: "https://imagensfivers.com/Games/Evolution-Live/GPKEVO_f6fdac8354ea904db507a13c6cf13b56.webp", rounds_free: false, status: true, original: false, game_code: "GPKEVO_f6fdac8354ea904db507a13c6cf13b56", provider: { name: "OFICIAL - EVOLUTION LIVE" } },
  { name: "Bacará Rápido", image_url: "https://imagensfivers.com/Games/Evolution-Live/GPKEVO_c605e257bc20ba94849999cdc3007f72.webp", rounds_free: false, status: true, original: false, game_code: "GPKEVO_c605e257bc20ba94849999cdc3007f72", provider: { name: "OFICIAL - EVOLUTION LIVE" } },
  { name: "Auto Roulette", image_url: "https://imagensfivers.com/Games/Ezugi/EZUGI_5001.webp", rounds_free: false, status: true, original: false, game_code: "EZUGI_5001", provider: { name: "OFICIAL - EZUGI" } },
  { name: "Baccarat", image_url: "https://imagensfivers.com/Games/Ezugi/EZUGI_100.webp", rounds_free: false, status: true, original: false, game_code: "EZUGI_100", provider: { name: "OFICIAL - EZUGI" } },
];

type LaunchPFGameResult =
  | { ok: true; launch_url: string; name?: string }
  | { ok: false; error: string; status?: number; code?: "ip_not_allowed" | "not_configured" | "frozen" | "profile_missing" | "launch_failed" };

class PFRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string,
  ) {
    super(message);
    this.name = "PFRequestError";
  }
}

async function pfFetch(path: string, init?: RequestInit) {
  // Read inside the call: process.env is only available in server handlers.
  const endpoint = resolvePFEndpoint(process.env.PLAYFIVERS_PROXY_URL, process.env.PLAYFIVERS_PROXY_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch(`${endpoint.base}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...endpoint.headers,
      ...(init?.headers ?? {}),
    },
  }).finally(() => clearTimeout(timeout));
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new PFRequestError(json?.msg ?? text ?? "Erro na PlayFivers", res.status, path);
  }
  return json;
}

async function getServerOutboundIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json() as { ip?: string };
    return json.ip ?? null;
  } catch {
    return null;
  }
}

async function normalizeLaunchError(error: unknown): Promise<LaunchPFGameResult> {
  if (error instanceof PFRequestError) {
    const isIpDenied = error.status === 403 && /ip/i.test(error.message);
    const outboundIp = isIpDenied ? await getServerOutboundIp() : null;
    return {
      ok: false,
      status: error.status,
      code: isIpDenied ? "ip_not_allowed" : "launch_failed",
      error: isIpDenied
        ? outboundIp
          ? `IP do servidor não autorizado na PlayFivers. Autorize exatamente este IP: ${outboundIp}`
          : "IP do servidor não autorizado na PlayFivers. Tente novamente em instantes."
        : `PlayFivers ${error.status}: ${error.message}`,
    };
  }

  return {
    ok: false,
    code: "launch_failed",
    error: error instanceof Error ? error.message : "Falha ao iniciar jogo",
  };
}

// Public — list of providers (cached)
let providersCache: { at: number; data: PFProvider[] } | null = null;
async function loadProviders() {
  if (providersCache && Date.now() - providersCache.at < 5 * 60_000) return providersCache.data;
  const json = await pfFetch("/api/v2/providers");
  const data: PFProvider[] = (json?.data ?? []).filter((p: PFProvider) => p.status === 1);
  providersCache = { at: Date.now(), data };
  return data;
}

export const getPFProviders = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await loadProviders();
  } catch (error) {
    console.error("PlayFivers providers unavailable", error);
    return providersCache?.data ?? [];
  }
});

// Public — list of games (optionally filtered by provider id)
const gamesCache = new Map<string, { at: number; data: PFGame[] }>();
type CatalogDiagnostics = {
  providers: number;
  providersLoaded: number;
  providersFailed: number;
  rawGames: number;
  uniqueGames: number;
  duplicatesRemoved: number;
  updatedAt: string;
};
type CatalogSnapshot = { at: number; data: PFGame[]; diagnostics: CatalogDiagnostics };
let catalogCache: CatalogSnapshot | null = null;
/** Só entram no catálogo jogos ativos e com arte remota válida. */
function hasArtwork(game: PFGame) {
  const url = (game.image_url ?? "").trim();
  return /^https?:\/\/\S+\.(webp|png|jpe?g|avif|gif)(\?\S*)?$/i.test(url);
}

async function loadProviderGames(providerId: number) {
  const key = String(providerId);
  const cached = gamesCache.get(key);
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.data;
  const json = await pfFetch(`/api/v2/games?provider=${providerId}`);
  const list: PFGame[] = (json?.data ?? []).filter((g: PFGame) => g.status && hasArtwork(g));
  gamesCache.set(key, { at: Date.now(), data: list });
  return list;
}

const PROVIDER_PRIORITY_HINTS = [
  "PG SOFT",
  "PGSOFT",
  "POCKET GAMES SOFT",
  "SPRIBE",
  "JETX",
  "AVIATRIX",
  "TURBO GAMES",
  "EVOLUTION LIVE",
  "EZUGI",
  "PRAGMATIC LIVE",
  "LIVE88",
  "DREAMGAMING LIVE",
  "WINFINITY",
  "GALAXSYS ORIGINAL",
  "PRAGMATIC",
];

function providerPriority(provider: PFProvider) {
  const name = provider.name.toUpperCase();
  const index = PROVIDER_PRIORITY_HINTS.findIndex((hint) => name.includes(hint));
  return index === -1 ? 999 : index;
}

/** Normaliza o provedor para agrupar variações do mesmo estúdio
 *  ("OFICIAL - PG SOFT", "PG SOFT", "PGSOFT ORIGINAL" -> "PGSOFT"). */
function providerBaseKey(name: string) {
  return name
    .toUpperCase()
    .replace(/^OFICIAL\s*-\s*/, "")
    .replace(/\b(ORIGINAL|OFICIAL|SLOTS|SLOT|LIVE|CASSINO|CASINO|GAMES|GAMING)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function gameNameKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Remove duplicados exatos (mesmo provedor + code) e o mesmo jogo repetido
 *  entre variações do provedor (ex.: PG SOFT x OFICIAL - PG SOFT). */
function dedupeGames<T extends { name: string; game_code: string; provider: { name: string } }>(
  games: T[],
  /** true no lobby geral: o mesmo título só aparece uma vez, mesmo em estúdios diferentes. */
  globalByName = false,
) {
  const seenCode = new Set<string>();
  const seenName = new Set<string>();
  const out: T[] = [];
  for (const game of games) {
    const codeKey = `${game.provider.name.toUpperCase()}:${game.game_code}`;
    const nameKey = globalByName
      ? `*:${gameNameKey(game.name)}`
      : `${providerBaseKey(game.provider.name)}:${gameNameKey(game.name)}`;
    if (seenCode.has(codeKey) || seenName.has(nameKey)) continue;
    seenCode.add(codeKey);
    seenName.add(nameKey);
    out.push(game);
  }
  return out;
}

function orderLobbyGames(games: PFGame[]) {
  const unique = dedupeGames(games, true);
  const crash = unique.filter((game) => getPFGameCategory(game) === "crash");
  const live = unique.filter((game) => getPFGameCategory(game) === "live");
  const slots = unique.filter((game) => getPFGameCategory(game) === "slot");
  const orderedSlots = sortPFSectionGames(slots, "slot");
  return [
    ...orderedSlots.slice(0, 72),
    ...sortPFSectionGames(crash, "crash"),
    ...sortPFSectionGames(live, "live"),
    ...orderedSlots.slice(72),
  ];
}

/** Providers loaded first: they cover the games the lobby actually shows. */
const FAST_PROVIDER_COUNT = 16;

let completeInFlight: Promise<CatalogSnapshot> | null = null;

/**
 * Fast path: only the priority studios, fully in parallel. Answers in ~1s so
 * the lobby paints immediately while the full catalog warms up in background.
 */
async function loadFastCatalog() {
  const providers = await loadProviders();
  const sorted = [...providers].sort((a, b) => providerPriority(a) - providerPriority(b));
  const settled = await Promise.allSettled(
    sorted.slice(0, FAST_PROVIDER_COUNT).map((provider) => loadProviderGames(provider.id)),
  );
  const raw = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return orderLobbyGames(raw);
}

async function loadCompleteCatalog() {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60_000) return catalogCache;
  if (completeInFlight) return completeInFlight;
  completeInFlight = buildCompleteCatalog().finally(() => {
    completeInFlight = null;
  });
  return completeInFlight;
}

async function buildCompleteCatalog() {
  const providers = await loadProviders();
  const sorted = [...providers].sort((a, b) => providerPriority(a) - providerPriority(b));
  const loaded: PFGame[][] = [];
  let failed = 0;
  for (let start = 0; start < sorted.length; start += 24) {
    const batch = sorted.slice(start, start + 24);
    const settled = await Promise.allSettled(batch.map((provider) => loadProviderGames(provider.id)));
    for (const result of settled) {
      if (result.status === "fulfilled") loaded.push(result.value);
      else failed += 1;
    }
  }
  const raw = loaded.flat();
  const data = orderLobbyGames(raw);
  const diagnostics: CatalogDiagnostics = {
    providers: sorted.length,
    providersLoaded: sorted.length - failed,
    providersFailed: failed,
    rawGames: raw.length,
    uniqueGames: data.length,
    duplicatesRemoved: Math.max(0, raw.length - data.length),
    updatedAt: new Date().toISOString(),
  };
  const snapshot: CatalogSnapshot = { at: Date.now(), data, diagnostics };
  catalogCache = snapshot;
  return snapshot;
}

/** Only the fields the UI renders — keeps the JSON payload small and fast. */
type PFGameLitePayload = {
  game_code: string;
  name: string;
  image_url: string;
  original: boolean;
  provider: { name: string };
};

function toLite(games: PFGame[]): PFGameLitePayload[] {
  return games.map((g) => ({
    game_code: g.game_code,
    name: g.name,
    image_url: g.image_url,
    original: g.original,
    provider: { name: g.provider.name },
  }));
}

function applyGameQuery(games: PFGame[], q?: string) {
  const query = q?.toLowerCase();
  return query
    ? games.filter((g) => g.name.toLowerCase().includes(query) || g.provider.name.toLowerCase().includes(query))
    : games;
}

export const getPFGames = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    providerId: z.number().int().optional(),
    limit: z.number().int().min(24).max(10_000).default(600),
    q: z.string().trim().max(80).optional(),
    /** true = wait for every provider (browse-all pages); false = fast lobby. */
    complete: z.boolean().default(false),
  }).parse(d ?? {}))
  .handler(async ({ data }) => {
    try {
      let list: PFGame[];
      if (data.providerId) {
        list = await loadProviderGames(data.providerId);
      } else {
        const fresh = catalogCache && Date.now() - catalogCache.at < 5 * 60_000 ? catalogCache : null;
        if (fresh) {
          list = fresh.data;
        } else if (data.complete) {
          list = (await loadCompleteCatalog()).data;
        } else {
          // Warm the full catalog without blocking this response.
          void loadCompleteCatalog().catch(() => undefined);
          list = await loadFastCatalog();
        }
      }
      if (!data.providerId && list.length === 0) list = orderLobbyGames(CURATED_FEATURED_GAMES);
      const filtered = dedupeGames(applyGameQuery(list, data.q), !data.providerId);
      return toLite(filtered.slice(0, data.limit));
    } catch (error) {
      console.error("PlayFivers games unavailable", error);
      const fallback = data.providerId ? gamesCache.get(String(data.providerId))?.data : [...gamesCache.values()].flatMap((c) => c.data);
      const list = data.providerId ? (fallback ?? []) : orderLobbyGames((fallback?.length ? fallback : CURATED_FEATURED_GAMES));
      const filtered = dedupeGames(applyGameQuery(list, data.q), !data.providerId);
      return toLite(filtered.slice(0, data.limit));
    }
  });

export const getPFCatalogDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso negado");
    return (await loadCompleteCatalog()).diagnostics;
  });

// Authenticated — launch a game for the current user
export const launchPFGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      game_code: z.string().min(1).max(120),
      provider: z.string().min(1).max(60),
      game_original: z.boolean(),
      lang: z.enum(["pt", "es", "en", "ja", "zh", "ru", "th", "hi"]).default("pt"),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<LaunchPFGameResult> => {
    const { supabase, userId } = context;
    const agentToken = process.env.PLAYFIVERS_AGENT_TOKEN;
    const secretKey = process.env.PLAYFIVERS_SECRET_KEY;
    if (!agentToken || !secretKey) return { ok: false, code: "not_configured", error: "PlayFivers não configurado" };

    // Block frozen accounts
    const { data: prof } = await supabase
      .from("profiles")
      .select("balance,is_frozen,freeze_reason")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) return { ok: false, code: "profile_missing", error: "Perfil não encontrado" };
    if (prof.is_frozen) {
      return { ok: false, code: "frozen", error: prof.freeze_reason ? `Conta congelada — ${prof.freeze_reason}` : "Conta congelada" };
    }

    // Note: deposit gate is enforced in the UI for slots/live; sportsbook is open to all logged-in users.

    try {
      const json = await pfFetch("/api/v2/game_launch", {
        method: "POST",
        body: JSON.stringify({
          agentToken,
          secretKey,
          user_code: userId,
          game_code: data.game_code,
          provider: data.provider,
          game_original: data.game_original,
          user_balance: Number(prof.balance ?? 0),
          lang: data.lang,
        }),
      });
      if (!json?.launch_url) return { ok: false, code: "launch_failed", error: json?.msg ?? "Falha ao iniciar jogo" };
      return { ok: true, launch_url: json.launch_url as string, name: json.name as string | undefined };
    } catch (error) {
      return normalizeLaunchError(error);
    }
  });
