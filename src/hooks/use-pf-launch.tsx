import { useMemo, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { readCatalogCache, writeCatalogCache } from "@/lib/pf-catalog-cache";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { launchPFGame, getPFGames, getPFProviders } from "@/lib/playfivers.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { canAccessGames } from "@/lib/game-access";

export interface PFGameLite {
  game_code: string;
  name: string;
  image_url: string;
  original: boolean;
  provider: { name: string };
}

export function usePFLaunch() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const launch = useServerFn(launchPFGame);
  const fetchProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
  });
  const [launchingCode, setLaunchingCode] = useState<string | null>(null);

  async function play(game: PFGameLite) {
    if (!user) { open("register"); return; }
    if (launchingCode) return;
    const gameWindow = window.open("about:blank", "_blank");
    setLaunchingCode(game.game_code);
    try {
      // Refresh before deciding: administrator credits and recent payments may
      // not yet be reflected in the cached header/profile balance.
      const profile = await profileQ.refetch();
      if (profile.error) throw profile.error;
      if (!profile.data) throw new Error("Não foi possível conferir seu saldo. Tente novamente.");
      if (!canAccessGames(profile.data)) {
        gameWindow?.close();
        open("deposit");
        return;
      }
      const res = await launch({
        data: {
          game_code: game.game_code,
          provider: game.provider.name,
          game_original: game.original,
          lang: "pt",
        },
      });
      if (!res.ok) {
        gameWindow?.close();
        toast.error(res.error);
        return;
      }
      if (gameWindow) {
        gameWindow.opener = null;
        gameWindow.location.replace(res.launch_url);
      } else {
        window.location.assign(res.launch_url);
      }
    } catch (e: unknown) {
      gameWindow?.close();
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o jogo");
    } finally {
      setLaunchingCode(null);
    }
  }

  return { play, launchingCode };
}

/** Remove títulos repetidos; a apresentação trata falhas de imagem sem ocultar jogos. */
function cleanGames(games: PFGameLite[]): PFGameLite[] {
  const seen = new Set<string>();
  const out: PFGameLite[] = [];
  for (const g of games) {
    const url = (g.image_url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const key = `${g.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
}

export function usePFGames(
  providerId?: number,
  options?: { limit?: number; q?: string; complete?: boolean },
) {
  const hydrated = useHydrated();
  const fetchGames = useServerFn(getPFGames);
  const limit = options?.limit ?? 600;
  const q = options?.q?.trim() || undefined;
  const complete = options?.complete ?? false;
  const cacheKey = `${providerId ?? "all"}|${limit}|${q ?? ""}|${complete}`;
  const cached = useMemo(() => {
    if (!hydrated) return null;
    const entry = readCatalogCache(cacheKey);
    /** Reaplica a limpeza: artes que quebraram depois não voltam pelo cache. */
    return entry ? { at: entry.at, games: cleanGames(entry.games) } : null;
  }, [cacheKey, hydrated]);

  const query = useQuery({
    queryKey: ["pf-games", providerId ?? "all", limit, q ?? "", complete],
    queryFn: async () => {
      const games = cleanGames(await fetchGames({ data: { providerId, limit, q, complete } }));
      writeCatalogCache(cacheKey, games);
      return games;
    },
    staleTime: 5 * 60_000,
    ...(cached ? { initialData: cached.games, initialDataUpdatedAt: cached.at } : {}),
  });

  // SSR and the first client render must show the same loading shell.
  // Browser-only cached rows become visible immediately after hydration.
  return hydrated ? query : { ...query, data: undefined, isLoading: true, isFetching: true };
}

export function usePFProviders() {
  const fetchProviders = useServerFn(getPFProviders);
  return useQuery({
    queryKey: ["pf-providers"],
    queryFn: () => fetchProviders(),
    staleTime: 5 * 60_000,
  });
}
