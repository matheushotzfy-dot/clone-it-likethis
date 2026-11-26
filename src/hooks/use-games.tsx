import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getLobbyGames,
  getLobbyCounts,
  getLobbyProviders,
  getTopGames,
  type LobbyCategory,
  type LobbyGame,
  type LobbyProvider,
} from "@/lib/playfivers.functions";
import type { GameKind } from "@/lib/game-kinds";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

export type { LobbyGame, LobbyCategory, LobbyProvider };

export interface LobbyFilter {
  category?: LobbyCategory | "all";
  kind?: GameKind;
  provider?: string;
  q?: string;
  featured?: boolean;
  sort?: "popular" | "az";
}

function toData(filter: LobbyFilter) {
  return {
    category: filter.category ?? "all",
    kind: filter.kind,
    provider: filter.provider,
    q: filter.q || undefined,
    featured: filter.featured,
    sort: filter.sort ?? "popular",
  };
}

const PAGE = 60;

export function useLobby(filter: LobbyFilter, limit = PAGE) {
  const fetchGames = useServerFn(getLobbyGames);
  return useQuery({
    queryKey: ["lobby", filter, limit],
    queryFn: () => fetchGames({ data: { ...toData(filter), limit } }),
    staleTime: 60_000,
  });
}

/** Catálogo paginado para as páginas de navegação completa. */
export function useLobbyPages(filter: LobbyFilter) {
  const fetchGames = useServerFn(getLobbyGames);
  return useInfiniteQuery({
    queryKey: ["lobby-pages", filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchGames({ data: { ...toData(filter), limit: PAGE, offset: pageParam } }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.games.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    staleTime: 60_000,
  });
}

/** Provedores com contagem; com categoria, só os que têm jogos nela. */
export function useProviders(category?: "slot" | "live" | "crash" | "table") {
  const fetchProviders = useServerFn(getLobbyProviders);
  return useQuery({
    queryKey: ["lobby-providers", category ?? "all"],
    queryFn: () => fetchProviders({ data: { category } }),
    staleTime: 5 * 60_000,
  });
}

export function useLobbyCounts() {
  const fetchCounts = useServerFn(getLobbyCounts);
  return useQuery({
    queryKey: ["lobby-counts"],
    queryFn: () => fetchCounts(),
    staleTime: 5 * 60_000,
  });
}

export function useTopGames() {
  const fetchTop = useServerFn(getTopGames);
  return useQuery({ queryKey: ["top-games"], queryFn: () => fetchTop(), staleTime: 5 * 60_000 });
}

/** Clique numa capa: decide entre cadastro, aviso de vitrine ou abrir o jogo. */
export function usePlay() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const navigate = useNavigate();
  return (game: LobbyGame) => {
    if (!user) {
      open("register");
      return;
    }
    if (!game.launchable) {
      toast("Este jogo entra no ar assim que o catálogo do provedor for ativado.");
      return;
    }
    navigate({ to: "/jogar/$gameId", params: { gameId: String(game.id) } });
  };
}
