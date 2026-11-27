import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ExternalLink, Loader2, Maximize2 } from "lucide-react";
import { getGameForPlay, launchGame, type LaunchResult } from "@/lib/playfivers.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useRefreshMoney, useWallet } from "@/hooks/use-account";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { formatDuration, useRgStatus } from "@/components/account/play-guard";

export const Route = createFileRoute("/jogar/$gameId")({
  head: () => ({
    meta: [{ title: "Jogando | apostamaxy" }, { name: "robots", content: "noindex" }],
  }),
  component: PlayPage,
});

/** Jogo aberto dentro do site: o saldo continua visível e o depósito fica a um toque. */
function PlayPage() {
  const { gameId } = Route.useParams();
  const id = Number(gameId);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { open } = useAuthDialog();
  const wallet = useWallet({ poll: true });
  const refresh = useRefreshMoney();
  const fetchGame = useServerFn(getGameForPlay);
  const launch = useServerFn(launchGame);
  const [result, setResult] = useState<LaunchResult | null>(null);

  const game = useQuery({
    queryKey: ["game", id],
    queryFn: () => fetchGame({ data: { id } }),
    enabled: Number.isInteger(id) && id > 0,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      open("login");
      return;
    }
    let cancelled = false;
    setResult(null);
    launch({ data: { gameId: id } })
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setResult({
            ok: false,
            code: "launch_failed",
            error: e instanceof Error ? e.message : "Não foi possível abrir o jogo.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Painel permanente durante o jogo: tempo de sessão e resultado do dia.
  // O aviso de tempo (PlayGuard) vale em todo o site, inclusive aqui.
  const rg = useRgStatus();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, []);
  const sessionMin = rg.data?.sessionStartedAt
    ? Math.max(0, Math.floor((now - new Date(rg.data.sessionStartedAt).getTime()) / 60_000))
    : null;
  const today = rg.data?.todayResult ?? 0;

  // Ao sair do jogo, o saldo do resto do site é recarregado.
  useEffect(() => () => refresh(), [refresh]);

  function goBack() {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  }

  function fullscreen() {
    document
      .getElementById("game-frame")
      ?.requestFullscreen?.()
      .catch(() => undefined);
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-sidebar px-2 pt-[env(safe-area-inset-top)] md:px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          aria-label="Voltar"
          className="size-10 shrink-0"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[19px] font-bold leading-tight">
            {game.data?.name ?? "Carregando…"}
          </p>
          {game.data && (
            <p className="truncate text-[12px] text-muted-foreground">
              {game.data.provider}
              {game.data.rtp != null && (
                <span className="num"> · RTP {String(game.data.rtp).replace(".", ",")}%</span>
              )}
            </p>
          )}
        </div>
        {rg.data && (
          <span
            className="num hidden shrink-0 text-right text-[12px] leading-tight text-muted-foreground md:block"
            title="Tempo de sessão e resultado de hoje"
          >
            Sessão {sessionMin === null ? "–" : formatDuration(sessionMin)}
            <br />
            Hoje {today > 0 ? "+" : today < 0 ? "−" : ""}
            {formatBRL(Math.abs(today))}
          </span>
        )}
        <span className="num hidden rounded-[8px] border border-border px-3 py-1.5 text-[14px] font-semibold sm:block">
          {wallet.data ? formatBRL(wallet.data.balance) : "–"}
        </span>
        <button
          type="button"
          onClick={() => open("deposit")}
          className="flex h-9 items-center gap-1.5 rounded-[8px] bg-pix px-3 text-[14px] font-bold text-pix-foreground hover:brightness-110"
        >
          <ArrowDownToLine className="size-4" /> <span className="hidden sm:inline">Depositar</span>
        </button>
        {result?.ok && (
          <Button
            variant="ghost"
            size="icon"
            onClick={fullscreen}
            aria-label="Tela cheia"
            className="hidden size-10 md:inline-flex"
          >
            <Maximize2 className="size-[18px]" />
          </Button>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        {!result && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-[14px]">Abrindo o jogo…</p>
            </div>
          </div>
        )}

        {result?.ok && (
          <>
            <iframe
              id="game-frame"
              src={result.launch_url}
              title={result.name}
              className="absolute inset-0 size-full border-0"
              allow="autoplay; fullscreen; encrypted-media; clipboard-write"
              allowFullScreen
            />
            <a
              href={result.launch_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-sidebar/90 px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
            >
              Não carregou? Abrir em nova aba <ExternalLink className="size-3.5" />
            </a>
          </>
        )}

        {result && !result.ok && (
          <div className="absolute inset-0 grid place-items-center px-6">
            <div className="max-w-sm text-center">
              <p className="font-display text-[26px] font-bold">
                {result.code === "deposit_required"
                  ? "Você está sem saldo"
                  : result.code === "identity_required"
                    ? "Verifique sua identidade"
                    : "Não foi possível abrir o jogo"}
              </p>
              <p className="mt-2 text-[15px] text-muted-foreground">{result.error}</p>
              <div className="mt-6 flex flex-col gap-2">
                {result.code === "deposit_required" ? (
                  <button
                    type="button"
                    onClick={() => open("deposit")}
                    className="h-11 rounded-[10px] bg-pix font-bold text-pix-foreground"
                  >
                    Depositar com Pix
                  </button>
                ) : result.code === "identity_required" ? (
                  <Button
                    className="h-11 rounded-[10px] font-bold"
                    onClick={() => open("identity")}
                  >
                    Enviar documento e selfie
                  </Button>
                ) : result.code === "launch_failed" ? (
                  <Button
                    className="h-11 rounded-[10px]"
                    onClick={() => {
                      setResult(null);
                      launch({ data: { gameId: id } }).then(setResult);
                    }}
                  >
                    Tentar de novo
                  </Button>
                ) : null}
                <Link
                  to="/"
                  className="h-11 content-center rounded-[10px] border border-border text-[15px] font-semibold hover:bg-surface"
                >
                  Voltar para o cassino
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
