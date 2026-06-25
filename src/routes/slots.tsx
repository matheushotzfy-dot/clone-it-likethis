import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/layout/site-shell";
import { getPFProviders, getPFGames, launchPFGame } from "@/lib/playfivers.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { getMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/slots")({
  head: () => ({
    meta: [
      { title: "Slots — SANTOSBET" },
      { name: "description", content: "Mais de 5.000 slots e jogos de cassino ao vivo dos melhores provedores." },
    ],
  }),
  component: SlotsPage,
});

function SlotsPage() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const fetchProviders = useServerFn(getPFProviders);
  const fetchGames = useServerFn(getPFGames);
  const fetchProfile = useServerFn(getMyProfile);
  const launch = useServerFn(launchPFGame);

  const [providerId, setProviderId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [launchingCode, setLaunchingCode] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);

  const providersQ = useQuery({
    queryKey: ["pf-providers"],
    queryFn: () => fetchProviders(),
    staleTime: 5 * 60_000,
  });
  const gamesQ = useQuery({
    queryKey: ["pf-games", providerId ?? "all"],
    queryFn: () => fetchGames({ data: { providerId: providerId ?? undefined } }),
    staleTime: 5 * 60_000,
  });
  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
  });

  const filtered = useMemo(() => {
    const games = gamesQ.data ?? [];
    if (!q.trim()) return games;
    const needle = q.trim().toLowerCase();
    return games.filter((g) => g.name.toLowerCase().includes(needle) || g.provider.name.toLowerCase().includes(needle));
  }, [gamesQ.data, q]);

  // Reset pagination when filters/search change
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  async function handlePlay(game: { game_code: string; provider: { name: string }; original: boolean; name: string }) {
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

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Slots</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {gamesQ.isLoading ? "Carregando..." : `${filtered.length} jogos disponíveis`}
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar jogo ou provedor..."
              className="pl-10 h-11 bg-surface"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Button
            variant={providerId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setProviderId(null)}
            className="shrink-0"
          >Todos</Button>
          {(providersQ.data ?? []).map((p) => (
            <Button
              key={p.id}
              variant={providerId === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => setProviderId(p.id)}
              className="shrink-0"
            >
              {p.name}
            </Button>
          ))}
        </div>

        {gamesQ.isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filtered.map((g) => (
              <button
                key={`${g.provider.name}-${g.game_code}`}
                onClick={() => handlePlay(g)}
                disabled={launchingCode === g.game_code}
                className="relative group block aspect-[3/4] rounded-xl overflow-hidden bg-surface border border-border hover:border-primary transition-all hover:scale-[1.02] touch-manipulation"
              >
                <img
                  src={g.image_url}
                  alt={g.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover bg-surface-2"
                  draggable={false}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {launchingCode === g.game_code ? (
                    <Loader2 className="size-8 animate-spin text-white" />
                  ) : (
                    <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Play className="size-5 fill-current" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-semibold text-white truncate">{g.name}</p>
                  <p className="text-[10px] text-white/60">{g.provider.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
