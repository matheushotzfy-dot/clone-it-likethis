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
        toast.error(res.error);
        return;
      }
      window.open(res.launch_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível abrir o jogo");
    } finally {
      setLaunchingCode(null);
    }
  }

  return { play, launchingCode };
}

export function usePFGames(providerId?: number) {
  const fetchGames = useServerFn(getPFGames);
  return useQuery({
    queryKey: ["pf-games", providerId ?? "all"],
    queryFn: () => fetchGames({ data: { providerId } }),
    staleTime: 5 * 60_000,
  });
}

export function usePFProviders() {
  const fetchProviders = useServerFn(getPFProviders);
  return useQuery({
    queryKey: ["pf-providers"],
    queryFn: () => fetchProviders(),
    staleTime: 5 * 60_000,
  });
}
