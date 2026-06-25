import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/layout/site-shell";
import { launchPFGame } from "@/lib/playfivers.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { Trophy, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/esportes")({
  head: () => ({ meta: [{ title: "Esportes — SANTOSBET" }] }),
  component: Page,
});

function Page() {
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
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canPlay = !!user;
  void profileQ;

  useEffect(() => {
    if (!canPlay) return;
    if (url || loading) return;
    setLoading(true);
    setError(null);
    launch({
      data: {
        game_code: "sport",
        provider: "DIGITAIN OFICIAL",
        game_original: true,
        lang: "pt",
      },
    })
      .then((res) => setUrl(res.launch_url))
      .catch((e: any) => setError(e?.message ?? "Falha ao carregar a sportsbook"))
      .finally(() => setLoading(false));
  }, [canPlay, url, loading, launch]);

  return (
    <SiteShell>
      <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Trophy className="size-7 text-primary" /> Esportes
            </h1>
            <p className="text-xs text-white/50 mt-1">Sportsbook ao vivo · futebol, basquete, tênis e mais</p>
          </div>
          {url && (
            <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="size-4 mr-2" /> Abrir em nova aba
            </Button>
          )}
        </div>

        {!user ? (
          <EmptyState
            title="Entre para apostar"
            description="Crie sua conta ou faça login para acessar a sportsbook."
            cta={<Button onClick={() => open("register")} className="font-bold">Criar conta</Button>}
          />
        ) : !profileQ.data?.hasDeposited ? (
          <EmptyState
            title="Faça um depósito"
            description="Depósito mínimo libera a sportsbook completa com odds reais."
            cta={<Button onClick={() => open("deposit")} className="font-bold">Depositar agora</Button>}
          />
        ) : loading || !url ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-white/60">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm">Carregando sportsbook...</p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
            <iframe
              src={url}
              title="Sportsbook"
              className="w-full h-[80vh] md:h-[85vh]"
              allow="fullscreen; autoplay; payment"
            />
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function EmptyState({ title, description, cta }: { title: string; description: string; cta: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <Trophy className="size-14 text-primary/40 mb-4" />
      <h2 className="text-xl font-black mb-2">{title}</h2>
      <p className="text-white/60 text-sm mb-6 max-w-md">{description}</p>
      {cta}
    </div>
  );
}
