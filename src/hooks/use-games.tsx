import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getLobbyGames,
  getLobbyProviders,
  getTopGames,
  type LobbyCategory,
  type LobbyGame,
} from "@/lib/playfivers.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

export type { LobbyGame, LobbyCategory };

export interface LobbyFilter {
  category?: LobbyCategory | "all";
  provider?: string;
  q?: string;
  featured?: boolean;
}

const PAGE = 60;

export function useLobby(filter: LobbyFilter, limit = PAGE) {
  const fetchGames = useServerFn(getLobbyGames);
  return useQuery({
    queryKey: ["lobby", filter, limit],
    queryFn: () =>
      fetchGames({
        data: {
          category: filter.category ?? "all",
          provider: filter.provider,
          q: filter.q || undefined,
          featured: filter.featured,
          limit,
        },
      }),
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
      fetchGames({
        data: {
          category: filter.category ?? "all",
          provider: filter.provider,
          q: filter.q || undefined,
          limit: PAGE,
          offset: pageParam,
        },
      }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.games.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    staleTime: 60_000,
  });
}

export function useProviders() {
  const fetchProviders = useServerFn(getLobbyProviders);
  return useQuery({
    queryKey: ["lobby-providers"],
    queryFn: () => fetchProviders(),
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
