import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { usePublicSettings, useRefreshMoney, useWallet } from "@/hooks/use-account";
import { placeSportsBet } from "@/lib/sports.functions";
import { formatBRL, newRequestId, parseBRL } from "@/lib/format";
import type { Selection } from "./event-row";

const PICK_LABEL = { home: "Casa", draw: "Empate", away: "Fora" } as const;

export function BetSlip({
  selection,
  onClear,
  stale,
}: {
  selection: Selection | null;
  onClear: () => void;
  stale?: boolean;
}) {
  const [stake, setStake] = useState("10");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(newRequestId);
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const settings = usePublicSettings();
  const wallet = useWallet();
  const refresh = useRefreshMoney();
  const place = useServerFn(placeSportsBet);
  const value = parseBRL(stake);
  const min = settings.data?.minBetSports ?? 1;
  const max = settings.data?.maxBetSports ?? 5000;
  const potential = selection ? Math.round(value * selection.odd * 100) / 100 : 0;
  const error = !selection
    ? null
    : value > 0 && value < min
      ? `Aposta mínima de ${formatBRL(min)}.`
      : value > max
        ? `Aposta máxima de ${formatBRL(max)}.`
        : user && wallet.data && value > wallet.data.balance
          ? "Saldo insuficiente."
          : settings.data && potential > settings.data.maxPayoutSports
            ? `O prêmio máximo é ${formatBRL(settings.data.maxPayoutSports)}.`
            : null;

  async function submit() {
    if (!selection) return;
    if (!user) {
      open("login");
      return;
    }
    if (error || value <= 0) return;
    setBusy(true);
    try {
      const { event, pick, odd } = selection;
      const res = await place({ data: { matchId: event.id, pick, odd, stake: value, requestId } });
      toast.success("Aposta feita", {
        description: `${PICK_LABEL[pick]} em ${event.home.name} x ${event.away.name}. Retorno possível de ${formatBRL(res.potential)}.`,
      });
      onClear();
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível apostar.");
    } finally {
      setBusy(false);
      setRequestId(newRequestId());
    }
  }

  return (
    <aside
      aria-label="Cupom de aposta"
      className="rounded-[14px] border border-border bg-surface p-4"
    >
      <h2 className="text-[22px]">Cupom</h2>
      {stale && (
        <p role="status" className="mt-2 text-[13px] text-gold">
          A cotação mudou. Escolha a odd de novo.
        </p>
      )}
      {!selection ? (
        <p className="py-8 text-center text-[14px] text-muted-foreground">
          Toque numa odd para montar a aposta.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="relative rounded-[10px] bg-background p-3 pr-10">
            <button
              type="button"
              onClick={onClear}
              aria-label="Remover palpite"
              className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <p className="text-[12.5px] text-muted-foreground">{selection.event.leagueLabel}</p>
            <p className="text-[14.5px] font-semibold">
              {selection.event.home.name} x {selection.event.away.name}
            </p>
            <p className="mt-1.5 flex items-baseline justify-between">
              <span className="text-[14px]">{PICK_LABEL[selection.pick]}</span>
              <span className="num font-display text-[20px] font-bold text-primary">
                {selection.odd.toFixed(2)}
              </span>
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold">Valor</span>
            <span className="flex h-12 items-center rounded-[10px] border border-input bg-background px-3.5 focus-within:border-primary">
              <span className="mr-2 text-muted-foreground">R$</span>
              <input
                value={stake}
                onChange={(e) => setStake(e.target.value.replace(/[^\d,]/g, ""))}
                inputMode="decimal"
                className="num w-full bg-transparent font-display text-[22px] font-bold outline-none"
              />
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[5, 10, 25, 50].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setStake(String(v))}
                className="num h-9 rounded-[8px] border border-border text-[14px] font-semibold hover:border-primary"
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[14px] text-muted-foreground">Retorno possível</span>
            <span className="num font-display text-[24px] font-bold text-gold">
              {formatBRL(potential)}
            </span>
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <Button
            className="h-12 w-full rounded-[10px] text-[16px] font-bold shadow-none"
            disabled={busy || (!!user && (!!error || value <= 0))}
            onClick={submit}
          >
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : user ? (
              `Apostar ${formatBRL(value)}`
            ) : (
              "Entrar para apostar"
            )}
          </Button>
          <p className="text-[12px] text-muted-foreground">
            A cotação é conferida de novo na hora da aposta. Resultado pelo tempo normal de jogo.
          </p>
        </div>
      )}
    </aside>
  );
}
