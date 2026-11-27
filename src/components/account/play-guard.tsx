import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Clock3, Loader2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, usePublicSettings } from "@/hooks/use-account";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import {
  acceptTerms,
  getMyRgStatus,
  markLimitsPrompted,
  pauseMe,
  touchSession,
} from "@/lib/account.functions";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useRgStatus() {
  const { user } = useAuth();
  const fetchStatus = useServerFn(getMyRgStatus);
  return useQuery({
    queryKey: ["rg-status"],
    queryFn: () => fetchStatus(),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Minutos desde o início da sessão, atualizado a cada 20 s. */
function useSessionMinutes(startedAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, []);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

/**
 * Painel permanente de jogo responsável (Portaria SPA/MF 1.231, art. 4º, X):
 * tempo da sessão, resultado do dia e atalho para limites, sempre visível logado.
 */
export function RgStrip() {
  const { user } = useAuth();
  const status = useRgStatus();
  const profile = useProfile();
  const settings = usePublicSettings();
  const { open } = useAuthDialog();
  const minutes = useSessionMinutes(status.data?.sessionStartedAt);
  if (!user || !status.data) return null;
  const s = status.data;
  const result = s.todayResult;
  const needsIdentity =
    settings.data?.requireIdentity && profile.data && profile.data.kyc_status !== "verified";
  const pending = profile.data?.kyc_status === "pending";

  return (
    <div className="rg-strip border-b border-border bg-surface/60">
      <div className="no-scrollbar mx-auto flex h-8 max-w-[1600px] items-center gap-3 overflow-x-auto px-3 text-[12px] text-muted-foreground sm:h-9 sm:gap-4 sm:text-[12.5px] md:px-5">
        <span className="flex shrink-0 items-center gap-1.5" title="Tempo desde que você entrou">
          <Clock3 className="size-3.5" />
          <span className="max-sm:sr-only">Sessão</span>{" "}
          <strong className="num font-semibold text-foreground">{formatDuration(minutes)}</strong>
        </span>
        <span className="shrink-0" title="Ganhos menos apostas de hoje, cassino e esportes">
          Hoje{" "}
          <strong
            className={cn(
              "num font-semibold",
              result > 0 ? "text-gold" : result < 0 ? "text-foreground" : "text-foreground",
            )}
          >
            {result > 0 ? "+" : result < 0 ? "−" : ""}
            {formatBRL(Math.abs(result))}
          </strong>
        </span>
        {s.todayBets > 0 && (
          <span className="shrink-0 max-sm:hidden">
            Apostas hoje{" "}
            <strong className="num font-semibold text-foreground">{s.todayBets}</strong>
          </span>
        )}
        {s.pausedUntil && (
          <span className="shrink-0 font-semibold text-foreground">
            Pausa<span className="max-sm:hidden"> ativa: só saque</span>
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {needsIdentity && (
            <button
              type="button"
              onClick={() => open("identity")}
              className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              <BadgeCheck className="size-3.5" />
              {pending ? "Em análise" : "Verificar"}
              <span className="max-sm:hidden">identidade</span>
            </button>
          )}
          <Link
            to="/perfil"
            search={{ aba: "limites" } as never}
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <SlidersHorizontal className="size-4 sm:size-3.5" />
            <span className="max-sm:sr-only">Limites</span>
          </Link>
        </span>
      </div>
    </div>
  );
}

/**
 * Regras que valem enquanto o jogador está logado:
 * - mantém a sessão viva no banco (base do limite de tempo);
 * - aviso a cada X minutos de sessão (o jogador escolhe X) com o resultado do dia;
 * - novo aceite quando os termos mudam (arts. 46 e 47);
 * - no primeiro acesso, sugere definir limites (art. 4º, VI);
 * - conta encerrada sai na hora.
 */
export function PlayGuard() {
  const { user, signOut } = useAuth();
  const profile = useProfile();
  const settings = usePublicSettings();
  const status = useRgStatus();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const touch = useServerFn(touchSession);
  const accept = useServerFn(acceptTerms);
  const prompted = useServerFn(markLimitsPrompted);
  const pause = useServerFn(pauseMe);

  // Heartbeat: só com a aba visível, a cada 60 s.
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      if (document.visibilityState === "visible")
        touch()
          .then(() => qc.invalidateQueries({ queryKey: ["rg-status"] }))
          .catch(() => null);
    };
    beat();
    const t = window.setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [user, touch, qc]);

  // Conta encerrada não fica logada.
  const closedAt = profile.data?.closed_at;
  useEffect(() => {
    if (user && closedAt) {
      toast.error("Esta conta foi encerrada.");
      void signOut();
    }
  }, [user, closedAt, signOut]);

  const termsVersion = settings.data?.termsVersion;
  const needsTerms =
    !!user && !!profile.data && !!termsVersion && profile.data.terms_version !== termsVersion;
  const needsLimitsPrompt =
    !!user && !!profile.data && !needsTerms && !profile.data.limits_prompted_at && !closedAt;

  const acceptMut = useMutation({
    mutationFn: () => accept({ data: { version: termsVersion! } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-profile"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const promptMut = useMutation({
    mutationFn: () => prompted(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-profile"] }),
  });

  // Aviso de tempo de sessão.
  const minutes = useSessionMinutes(status.data?.sessionStartedAt);
  const every = status.data?.alertMinutes ?? 60;
  const sessionKey = status.data?.sessionStartedAt ?? "";
  const step = every > 0 ? Math.floor(minutes / every) : 0;
  const [alertOpen, setAlertOpen] = useState(false);
  const shownRef = useRef<string>("");
  useEffect(() => {
    if (!user || !sessionKey || step < 1) return;
    const key = `${sessionKey}:${step}`;
    let seen = shownRef.current;
    try {
      seen = sessionStorage.getItem("rg-alert") ?? seen;
    } catch {
      /* sem storage: só memória */
    }
    if (seen === key) return;
    shownRef.current = key;
    try {
      sessionStorage.setItem("rg-alert", key);
    } catch {
      /* ignora */
    }
    setAlertOpen(true);
  }, [user, sessionKey, step]);

  const pauseMut = useMutation({
    mutationFn: () => pause({ data: { days: 1 } }),
    onSuccess: () => {
      toast.success("Pausa de 24 horas ativada. Você ainda pode sacar.");
      setAlertOpen(false);
      for (const k of ["rg-status", "rg-limits", "wallet"]) qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const today = status.data?.todayResult ?? 0;
  const todayText = useMemo(
    () =>
      today === 0
        ? "sem ganho nem perda"
        : today > 0
          ? `ganho de ${formatBRL(today)}`
          : `perda de ${formatBRL(-today)}`,
    [today],
  );

  if (!user) return null;

  return (
    <>
      <AlertDialog open={needsTerms}>
        <AlertDialogContent className="rounded-[16px] border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[24px]">
              <ShieldCheck className="size-6 text-primary" /> Os termos mudaram
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-[14.5px] leading-relaxed">
              <span className="block">
                Atualizamos os Termos de Uso e a Política de Privacidade. Para continuar jogando,
                leia e aceite a nova versão.
              </span>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  to="/legal/termos"
                  target="_blank"
                  className="font-semibold text-primary underline"
                >
                  Termos de Uso
                </Link>
                <Link
                  to="/legal/privacidade"
                  target="_blank"
                  className="font-semibold text-primary underline"
                >
                  Política de Privacidade
                </Link>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="secondary"
              className="rounded-[10px] shadow-none"
              onClick={() => signOut()}
            >
              Sair da conta
            </Button>
            <Button
              className="rounded-[10px] font-bold shadow-none"
              disabled={acceptMut.isPending}
              onClick={() => acceptMut.mutate()}
            >
              {acceptMut.isPending ? <Loader2 className="animate-spin" /> : "Li e aceito"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={needsLimitsPrompt && !alertOpen}>
        <AlertDialogContent className="rounded-[16px] border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[24px]">Defina seus limites</AlertDialogTitle>
            <AlertDialogDescription className="text-[14.5px] leading-relaxed">
              Antes de começar, escolha quanto quer depositar ou perder por dia, semana e mês, e
              quanto tempo quer jogar. Diminuir vale na hora; aumentar só depois de 24 horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="secondary"
              className="rounded-[10px] shadow-none"
              disabled={promptMut.isPending}
              onClick={() => promptMut.mutate()}
            >
              Agora não
            </Button>
            <Button
              className="rounded-[10px] font-bold shadow-none"
              onClick={() => {
                promptMut.mutate();
                navigate({ to: "/perfil", search: { aba: "limites" } as never });
              }}
            >
              Definir limites
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="rounded-[16px] border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[24px]">
              <Clock3 className="size-6 text-primary" /> Você está jogando há{" "}
              {formatDuration(minutes)}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14.5px] leading-relaxed">
              Hoje você teve {todayText}. Que tal uma pausa? Você escolhe a frequência deste aviso
              nos seus limites de jogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="secondary"
              className="rounded-[10px] shadow-none"
              disabled={pauseMut.isPending}
              onClick={() => pauseMut.mutate()}
            >
              {pauseMut.isPending ? <Loader2 className="animate-spin" /> : "Pausar por 24 horas"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="rounded-[10px] shadow-none"
                onClick={() => {
                  setAlertOpen(false);
                  void signOut();
                }}
              >
                Sair
              </Button>
              <Button
                className="rounded-[10px] font-bold shadow-none"
                onClick={() => setAlertOpen(false)}
              >
                Continuar
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
