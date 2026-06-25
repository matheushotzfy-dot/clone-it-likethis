import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PF_BASE = "https://api.playfivers.com";

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

async function pfFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${PF_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`PlayFivers ${path} ${res.status}: ${json?.msg ?? text}`);
  }
  return json;
}

// Public — list of providers (cached)
let providersCache: { at: number; data: PFProvider[] } | null = null;
export const getPFProviders = createServerFn({ method: "GET" }).handler(async () => {
  if (providersCache && Date.now() - providersCache.at < 5 * 60_000) return providersCache.data;
  const json = await pfFetch("/api/v2/providers");
  const data: PFProvider[] = (json?.data ?? []).filter((p: PFProvider) => p.status === 1);
  providersCache = { at: Date.now(), data };
  return data;
});

// Public — list of games (optionally filtered by provider id)
const gamesCache = new Map<string, { at: number; data: PFGame[] }>();
export const getPFGames = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ providerId: z.number().int().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const key = String(data.providerId ?? "all");
    const cached = gamesCache.get(key);
    if (cached && Date.now() - cached.at < 5 * 60_000) return cached.data;
    const qs = data.providerId ? `?provider=${data.providerId}` : "";
    const json = await pfFetch(`/api/v2/games${qs}`);
    const list: PFGame[] = (json?.data ?? []).filter((g: PFGame) => g.status);
    gamesCache.set(key, { at: Date.now(), data: list });
    return list;
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
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agentToken = process.env.PLAYFIVERS_AGENT_TOKEN;
    const secretKey = process.env.PLAYFIVERS_SECRET_KEY;
    if (!agentToken || !secretKey) throw new Error("PlayFivers não configurado");

    // Block frozen accounts
    const { data: prof } = await supabase
      .from("profiles")
      .select("balance,is_frozen,freeze_reason")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) throw new Error("Perfil não encontrado");
    if (prof.is_frozen) throw new Error(prof.freeze_reason ? `Conta congelada — ${prof.freeze_reason}` : "Conta congelada");

    // Note: deposit gate is enforced in the UI for slots/live; sportsbook is open to all logged-in users.

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
    if (!json?.launch_url) throw new Error(json?.msg ?? "Falha ao iniciar jogo");
    return { launch_url: json.launch_url as string, name: json.name as string };
  });
