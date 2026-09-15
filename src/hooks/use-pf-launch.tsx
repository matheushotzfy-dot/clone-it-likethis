import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { launchPFGame, getPFGames, getPFProviders } from "@/lib/playfivers.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

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
    if (!profileQ.data?.hasDeposited) { open("deposit"); return; }
    const gameWindow = window.open("about:blank", "_blank");
    setLaunchingCode(game.game_code);
    try {
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
    } catch (e: any) {
      gameWindow?.close();
      toast.error(e?.message ?? "Não foi possível abrir o jogo");
    } finally {
      setLaunchingCode(null);
    }
  }

  return { play, launchingCode };
}

/** Remove jogos sem arte e títulos repetidos antes de chegar na tela. */
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
  const fetchGames = useServerFn(getPFGames);
  const limit = options?.limit ?? 600;
  const q = options?.q?.trim() || undefined;
  const complete = options?.complete ?? false;
  const cacheKey = `${providerId ?? "all"}|${limit}|${q ?? ""}|${complete}`;
  const cached = useMemo(() => readCatalogCache(cacheKey), [cacheKey]);

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

  return query;
}

export function usePFProviders() {
  const fetchProviders = useServerFn(getPFProviders);
  return useQuery({
    queryKey: ["pf-providers"],
    queryFn: () => fetchProviders(),
    staleTime: 5 * 60_000,
  });
}
