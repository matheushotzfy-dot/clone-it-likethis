import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-guard";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolvePFEndpoint } from "./playfivers-endpoint";
import {
  FEATURED_COUNT,
  catalogCategory,
  defaultSortOrder,
  hasArtwork,
  isOfficialProvider,
  providerLabel,
} from "./pf-catalog-rules";
import { games as showcaseGames } from "./games";
import { gameKind, kindOrFilter, type GameKind } from "./game-kinds";

// ---------------------------------------------------------------------------
// Tipos expostos para a interface
// ---------------------------------------------------------------------------
export type LobbyCategory = "slot" | "live" | "crash" | "table" | "other";

export interface LobbyGame {
  id: number;
  name: string;
  provider: string;
  image_url: string | null;
  category: LobbyCategory;
  featured: boolean;
  /** Roleta, game show, baccarat ou blackjack; null para o resto. */
  kind: GameKind | null;
  /** Entrou no catálogo nos últimos 14 dias (só no catálogo real). */
  isNew: boolean;
  /** false = vitrine local enquanto o catálogo da PlayFivers não foi sincronizado. */
  launchable: boolean;
}

export interface LobbyProvider {
  name: string;
  games: number;
  covers: string[];
}

const NEW_DAYS = 14;
type GameRow = {
  id: number;
  name: string;
  provider: string;
  image_url: string | null;
  category: string;
  featured: boolean;
  created_at?: string | null;
};
function toLobbyGame(g: GameRow): LobbyGame {
  return {
    id: g.id,
    name: g.name,
    provider: g.provider,
    image_url: g.image_url,
    category: g.category as LobbyCategory,
    featured: g.featured,
    kind: gameKind(g.name),
    isNew: !!g.created_at && Date.now() - new Date(g.created_at).getTime() < NEW_DAYS * 86_400_000,
    launchable: true,
  };
}
const GAME_COLS = "id,name,provider,image_url,category,featured,created_at";

// ---------------------------------------------------------------------------
// Acesso à API da PlayFivers (sempre via resolvePFEndpoint por causa do IP fixo)
// ---------------------------------------------------------------------------
class PFRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "PFRequestError";
  }
}

async function pfFetch(path: string, init?: RequestInit) {
  const endpoint = resolvePFEndpoint(
    process.env.PLAYFIVERS_PROXY_URL,
    process.env.PLAYFIVERS_PROXY_KEY,
  );
  const res = await fetch(`${endpoint.base}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...endpoint.headers,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* resposta não-JSON */
  }
  if (!res.ok)
    throw new PFRequestError(String(json?.msg ?? (text || "Erro na PlayFivers")), res.status);
  return json;
}

function pfCredentials() {
  const agentToken = process.env.PLAYFIVERS_AGENT_TOKEN;
  const secretKey = process.env.PLAYFIVERS_SECRET_KEY;
  return agentToken && secretKey ? { agentToken, secretKey } : null;
}

// ---------------------------------------------------------------------------
// Lobby (público)
// ---------------------------------------------------------------------------
function showcase(): LobbyGame[] {
  const map: Record<string, LobbyCategory> = {
    slots: "slot",
    crash: "crash",
    live: "live",
    table: "table",
  };
  return showcaseGames
    .filter((g) => g.image)
    .map((g, i) => ({
      id: -(i + 1),
      name: g.name,
      provider: g.provider,
      image_url: g.image,
      category: map[g.category] ?? "slot",
      featured: i < FEATURED_COUNT,
      kind: gameKind(g.name),
      isNew: false,
      launchable: false,
    }));
}

function plain(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const lobbySchema = z.object({
  category: z.enum(["all", "slot", "live", "crash", "table", "other"]).default("all"),
  kind: z.enum(["roulette", "gameshow", "baccarat", "blackjack"]).optional(),
  provider: z.string().trim().max(60).optional(),
  q: z.string().trim().max(80).optional(),
  featured: z.boolean().optional(),
  sort: z.enum(["popular", "az"]).default("popular"),
  limit: z.number().int().min(1).max(2000).default(60),
  offset: z.number().int().min(0).default(0),
});
type LobbyQuery = z.infer<typeof lobbySchema>;

function filterShowcase(data: LobbyQuery) {
  let list = showcase();
  // Mesa (blackjack de cartas) aparece junto do ao vivo, como no catálogo real.
  if (data.category === "live")
    list = list.filter((g) => g.category === "live" || g.category === "table");
  else if (data.category !== "all") list = list.filter((g) => g.category === data.category);
  if (data.kind) list = list.filter((g) => g.kind === data.kind);
  if (data.provider) list = list.filter((g) => g.provider === data.provider);
  if (data.featured) list = list.filter((g) => g.featured);
  if (data.q) {
    const t = plain(data.q);
    list = list.filter((g) => plain(g.name).includes(t) || plain(g.provider).includes(t));
  }
  if (data.sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return list;
}

let catalogEmptyCache: { at: number; empty: boolean } | null = null;
async function catalogIsEmpty() {
  if (catalogEmptyCache && Date.now() - catalogEmptyCache.at < 60_000)
    return catalogEmptyCache.empty;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  catalogEmptyCache = { at: Date.now(), empty: !count };
  return !count;
}

export const getLobbyGames = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => lobbySchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    // Catálogo ainda vazio (PlayFivers não configurada): vitrine local com os mesmos filtros.
    if (await catalogIsEmpty()) {
      const list = filterShowcase(data);
      return {
        games: list.slice(data.offset, data.offset + data.limit),
        total: list.length,
        showcase: true,
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("games").select(GAME_COLS, { count: "exact" }).eq("active", true);
    if (data.sort === "az") q = q.order("name", { ascending: true });
    else
      q = q
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
    if (data.category === "live") q = q.in("category", data.kind ? ["live", "table"] : ["live"]);
    else if (data.category !== "all") q = q.eq("category", data.category);
    if (data.kind) q = q.or(kindOrFilter(data.kind));
    if (data.provider) q = q.eq("provider", data.provider);
    if (data.featured) q = q.eq("featured", true);
    if (data.q) {
      const t = data.q.replace(/[%_,()]/g, " ");
      q = q.or(`name.ilike.%${t}%,provider.ilike.%${t}%`);
    }
    const { data: rows, count, error } = await q.range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error("Não foi possível carregar os jogos");
    const games = (rows ?? []).map((g) => toLobbyGame(g as GameRow));
    return { games, total: count ?? games.length, showcase: false };
  });

export interface LobbyCounts {
  all: number;
  slot: number;
  crash: number;
  live: number;
  kinds: Record<GameKind, number>;
  showcase: boolean;
}

/** Quantos jogos há em cada categoria e tipo (sidebar e atalhos). */
export const getLobbyCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<LobbyCounts> => {
    if (await catalogIsEmpty()) {
      const list = showcase();
      const kinds = { roulette: 0, gameshow: 0, baccarat: 0, blackjack: 0 } as Record<
        GameKind,
        number
      >;
      for (const g of list) if (g.kind) kinds[g.kind] += 1;
      return {
        all: list.length,
        slot: list.filter((g) => g.category === "slot").length,
        crash: list.filter((g) => g.category === "crash").length,
        live: list.filter((g) => g.category === "live" || g.category === "table").length,
        kinds,
        showcase: true,
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base = () =>
      supabaseAdmin.from("games").select("id", { count: "exact", head: true }).eq("active", true);
    const kindIds: GameKind[] = ["roulette", "gameshow", "baccarat", "blackjack"];
    const [all, slot, crash, live, ...kindCounts] = await Promise.all([
      base(),
      base().eq("category", "slot"),
      base().eq("category", "crash"),
      base().in("category", ["live", "table"]),
      ...kindIds.map((k) => base().in("category", ["live", "table"]).or(kindOrFilter(k))),
    ]);
    const kinds = Object.fromEntries(
      kindIds.map((k, i) => [k, kindCounts[i].count ?? 0]),
    ) as Record<GameKind, number>;
    return {
      all: all.count ?? 0,
      slot: slot.count ?? 0,
      crash: crash.count ?? 0,
      live: live.count ?? 0,
      kinds,
      showcase: false,
    };
  },
);

export const getLobbyProviders = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ category: z.enum(["slot", "live", "crash", "table"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<LobbyProvider[]> => {
    if (await catalogIsEmpty()) {
      const map = new Map<string, LobbyProvider>();
      const inCat = (c: LobbyCategory) =>
        !data.category ||
        (data.category === "live" ? c === "live" || c === "table" : c === data.category);
      for (const g of showcase().filter((x) => inCat(x.category))) {
        const cur = map.get(g.provider) ?? { name: g.provider, games: 0, covers: [] };
        cur.games += 1;
        if (cur.covers.length < 3 && g.image_url) cur.covers.push(g.image_url);
        map.set(g.provider, cur);
      }
      return [...map.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("lobby_providers", {
      p_category: data.category,
    });
    if (error) throw new Error("Não foi possível carregar os provedores");
    return (rows ?? []).map((p) => ({
      name: p.provider,
      games: Number(p.games),
      covers: p.covers ?? [],
    }));
  });

// ---------------------------------------------------------------------------
// Abrir jogo
// ---------------------------------------------------------------------------
export type LaunchResult =
  | { ok: true; launch_url: string; name: string }
  | {
      ok: false;
      error: string;
      code:
        | "not_configured"
        | "unavailable"
        | "blocked"
        | "deposit_required"
        | "ip_not_allowed"
        | "identity_required"
        | "launch_failed";
    };

export const launchGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ gameId: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }): Promise<LaunchResult> => {
    const { userId } = context;
    const m = await import("./money.server");
    const admin = await m.getAdminClient();

    const settings = await m.loadMoneySettings();
    if (settings.maintenance_mode)
      return { ok: false, code: "unavailable", error: "Plataforma em manutenção." };
    if (!settings.casino_enabled)
      return {
        ok: false,
        code: "unavailable",
        error: "O cassino está temporariamente indisponível.",
      };

    const { data: game } = await admin
      .from("games")
      .select("id,name,provider_code,game_code,is_original,active")
      .eq("id", data.gameId)
      .maybeSingle();
    // Defesa em profundidade: mesmo que algo escape da sincronização, clone nunca abre.
    if (!game || !game.active || game.is_original || !isOfficialProvider(game.provider_code)) {
      return { ok: false, code: "unavailable", error: "Este jogo não está disponível." };
    }

    try {
      await m.assertNotFrozen(userId);
      await m.rgCheck(userId, "bet", 0);
    } catch (e) {
      const identity = e instanceof m.MoneyError && e.code === "IDENTITY_REQUIRED";
      return {
        ok: false,
        code: identity ? "identity_required" : "blocked",
        error: e instanceof Error ? e.message : "Conta bloqueada para jogos.",
      };
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle();
    const balance = Number(profile?.balance ?? 0);
    if (balance <= 0)
      return { ok: false, code: "deposit_required", error: "Você precisa de saldo para jogar." };

    const creds = pfCredentials();
    const record = async (ok: boolean, error?: string) => {
      await admin.from("game_launches").insert({
        user_id: userId,
        provider_code: game.provider_code,
        game_code: game.game_code,
        game_name: game.name,
        balance,
        ok,
        error: error ?? null,
      });
    };
    if (!creds) {
      await record(false, "not_configured");
      return {
        ok: false,
        code: "not_configured",
        error: "Os jogos ainda não estão liberados nesta plataforma.",
      };
    }

    try {
      const json = await pfFetch("/api/v2/game_launch", {
        method: "POST",
        // user_rtp nunca é enviado: o RTP é o do próprio provedor.
        body: JSON.stringify({
          agentToken: creds.agentToken,
          secretKey: creds.secretKey,
          user_code: userId,
          game_code: game.game_code,
          provider: game.provider_code,
          game_original: false,
          user_balance: balance,
          lang: "pt",
        }),
      });
      const url = typeof json?.launch_url === "string" ? json.launch_url : null;
      if (!url) {
        await record(false, String(json?.msg ?? "sem launch_url"));
        return {
          ok: false,
          code: "launch_failed",
          error: "O provedor não abriu o jogo. Tente novamente.",
        };
      }
      await record(true);
      return { ok: true, launch_url: url, name: game.name };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "erro";
      await record(false, msg.slice(0, 300));
      if (error instanceof PFRequestError && error.status === 403 && /ip/i.test(error.message)) {
        return {
          ok: false,
          code: "ip_not_allowed",
          error: "Jogos indisponíveis no momento. Tente mais tarde.",
        };
      }
      return {
        ok: false,
        code: "launch_failed",
        error: "Não foi possível abrir o jogo. Tente novamente.",
      };
    }
  });

// ---------------------------------------------------------------------------
// Admin: sincronizar catálogo, editar jogo, carteiras da PlayFivers
// ---------------------------------------------------------------------------
interface PFProvider {
  id: number;
  name: string;
  status: number;
}
interface PFGame {
  name: string;
  image_url: string;
  status: boolean;
  original: boolean;
  game_code: string;
  provider?: { name?: string };
}

export const syncCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!pfCredentials())
      throw new Error("Configure as chaves da PlayFivers antes de sincronizar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();

    const providersJson = await pfFetch("/api/v2/providers");
    const providers = ((providersJson?.data ?? []) as PFProvider[]).filter(
      (p) => p.status === 1 && isOfficialProvider(p.name),
    );

    const loadedProviders: string[] = [];
    const failed: string[] = [];
    const incoming: PFGame[] = [];
    for (let i = 0; i < providers.length; i += 8) {
      const batch = providers.slice(i, i + 8);
      const settled = await Promise.allSettled(
        batch.map((p) => pfFetch(`/api/v2/games?provider=${p.id}`)),
      );
      settled.forEach((r, idx) => {
        const provider = batch[idx];
        if (r.status === "rejected") {
          failed.push(provider.name);
          return;
        }
        loadedProviders.push(provider.name);
        for (const g of (r.value?.data ?? []) as PFGame[]) {
          incoming.push({ ...g, provider: { name: g.provider?.name ?? provider.name } });
        }
      });
    }

    const valid = incoming.filter(
      (g) =>
        g.status &&
        !g.original &&
        g.game_code &&
        g.name &&
        hasArtwork(g.image_url) &&
        isOfficialProvider(g.provider?.name ?? ""),
    );

    const { data: existingRows } = await supabaseAdmin
      .from("games")
      .select("provider_code,game_code")
      .limit(50_000);
    const existing = new Set((existingRows ?? []).map((r) => `${r.provider_code}::${r.game_code}`));

    const seen = new Set<string>();
    const toInsert: Record<string, unknown>[] = [];
    const toRefresh: Record<string, unknown>[] = [];
    for (const g of valid) {
      const providerCode = g.provider!.name!;
      const key = `${providerCode}::${g.game_code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const common = {
        provider_code: providerCode,
        game_code: g.game_code,
        provider: providerLabel(providerCode),
        name: g.name.trim(),
        image_url: g.image_url.trim(),
        is_original: false,
        last_seen_at: startedAt,
        updated_at: startedAt,
      };
      if (existing.has(key)) {
        toRefresh.push(common);
      } else {
        const sort = defaultSortOrder(g.name, providerCode);
        toInsert.push({
          ...common,
          category: catalogCategory(g.name, providerCode, g.game_code),
          sort_order: sort,
          featured: sort <= FEATURED_COUNT * 10,
          active: true,
        });
      }
    }

    for (let i = 0; i < toInsert.length; i += 500) {
      const { error } = await supabaseAdmin
        .from("games")
        .insert(toInsert.slice(i, i + 500) as never);
      if (error) throw new Error(`Falha ao inserir jogos: ${error.message}`);
    }
    // Atualiza só nome/arte/provedor; ordem, destaque, categoria e ativo são do admin.
    for (let i = 0; i < toRefresh.length; i += 500) {
      const { error } = await supabaseAdmin
        .from("games")
        .upsert(toRefresh.slice(i, i + 500) as never, { onConflict: "provider_code,game_code" });
      if (error) throw new Error(`Falha ao atualizar jogos: ${error.message}`);
    }

    // Jogos que sumiram de um provedor que carregou certo saem do lobby.
    let deactivated = 0;
    if (loadedProviders.length) {
      const { data: gone } = await supabaseAdmin
        .from("games")
        .update({ active: false, updated_at: startedAt })
        .in("provider_code", loadedProviders)
        .lt("last_seen_at", startedAt)
        .eq("active", true)
        .select("id");
      deactivated = gone?.length ?? 0;
    }

    await context.supabase.rpc("admin_log", {
      p_action: "catalog.sync",
      p_details: {
        providers: providers.length,
        failed,
        inserted: toInsert.length,
        refreshed: toRefresh.length,
        deactivated,
      } as never,
    });
    return {
      providers: providers.length,
      failed,
      inserted: toInsert.length,
      refreshed: toRefresh.length,
      deactivated,
    };
  });

export const listCatalogAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().trim().max(80).optional(),
        provider: z.string().trim().max(60).optional(),
        category: z.enum(["all", "slot", "live", "crash", "table", "other"]).default("all"),
        status: z.enum(["all", "active", "inactive", "featured"]).default("all"),
        page: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const pageSize = 60;
    let q = context.supabase
      .from("games")
      .select(
        "id,provider_code,provider,game_code,name,image_url,category,active,featured,sort_order,last_seen_at,rtp",
        { count: "exact" },
      )
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);
    if (data.q) q = q.ilike("name", `%${data.q.replace(/[%_]/g, "")}%`);
    if (data.provider) q = q.eq("provider", data.provider);
    if (data.category !== "all") q = q.eq("category", data.category);
    if (data.status === "active") q = q.eq("active", true);
    if (data.status === "inactive") q = q.eq("active", false);
    if (data.status === "featured") q = q.eq("featured", true);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { games: rows ?? [], total: count ?? 0, pageSize };
  });

export const updateCatalogGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.number().int().positive(),
        active: z.boolean().optional(),
        featured: z.boolean().optional(),
        sort_order: z.number().int().min(0).max(100_000).optional(),
        category: z.enum(["slot", "live", "crash", "table", "other"]).optional(),
        // RTP informado pelo provedor/certificado do jogo (Portaria 1.231, art. 4º, IX).
        rtp: z.number().min(50).max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("games")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("admin_log", {
      p_action: "catalog.update",
      p_target_id: String(id),
      p_details: patch as never,
    });
    return { ok: true };
  });

export const getPFStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const creds = pfCredentials();
    const endpoint = resolvePFEndpoint(
      process.env.PLAYFIVERS_PROXY_URL,
      process.env.PLAYFIVERS_PROXY_KEY,
    );
    const status = {
      configured: !!creds,
      callbackToken: (process.env.PLAYFIVERS_CALLBACK_TOKEN ?? "").length >= 24,
      agentCode: !!process.env.PLAYFIVERS_AGENT_CODE,
      viaProxy: endpoint.viaProxy,
      wallets: null as Record<string, number> | null,
      error: null as string | null,
    };
    if (!creds) return status;
    try {
      const qs = new URLSearchParams({ agentToken: creds.agentToken, secretKey: creds.secretKey });
      const json = await pfFetch(`/api/v2/balances?${qs}`);
      status.wallets = (json?.data ?? null) as Record<string, number> | null;
    } catch (e) {
      status.error = e instanceof Error ? e.message : "Falha ao consultar a PlayFivers";
    }
    return status;
  });

/**
 * Top 10: jogos com mais rodadas nos últimos 7 dias. Enquanto não há rodadas
 * suficientes, completa com os destaques do catálogo (e avisa via `ranked`).
 */
/**
 * Top 10 do lobby: mais jogados da semana (por número de jogadores) quando houver
 * rodadas suficientes; senão, os destaques do catálogo (ordem do admin).
 */
export const getTopGames = createServerFn({ method: "GET" }).handler(async () => {
  if (await catalogIsEmpty()) return { games: showcase().slice(0, 10), byPlays: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const out: LobbyGame[] = [];
  const seen = new Set<number>();
  const { data: ranked } = await supabaseAdmin.rpc("lobby_top_games", { p_days: 7, p_limit: 20 });
  const ids = (ranked ?? []).map((r) => Number(r.game_id));
  if (ids.length) {
    const { data: rows } = await supabaseAdmin.from("games").select(GAME_COLS).in("id", ids);
    for (const id of ids) {
      const g = (rows ?? []).find((x) => x.id === id);
      if (g && g.image_url && !seen.has(g.id)) {
        seen.add(g.id);
        out.push(toLobbyGame(g as GameRow));
      }
      if (out.length === 10) break;
    }
  }
  const byPlays = out.length >= 10;
  if (!byPlays) {
    out.length = 0;
    seen.clear();
    const { data: featured } = await supabaseAdmin
      .from("games")
      .select(GAME_COLS)
      .eq("active", true)
      .not("image_url", "is", null)
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(10);
    for (const g of featured ?? []) out.push(toLobbyGame(g as GameRow));
  }
  return { games: out, byPlays };
});

export const getGameForPlay = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: g } = await supabaseAdmin
      .from("games")
      .select("id,name,provider,image_url,category,rtp")
      .eq("id", data.id)
      .eq("active", true)
      .maybeSingle();
    return g ?? null;
  });
