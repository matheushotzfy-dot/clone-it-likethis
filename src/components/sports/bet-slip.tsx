import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { placeSportsBet } from "@/lib/sports.functions";
import type { Selection } from "./event-row";

const PICK_LABEL = { home: "Casa", draw: "Empate", away: "Fora" } as const;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BetSlip({ selection, onClear }: { selection: Selection | null; onClear: () => void }) {
  const [stake, setStake] = useState("10");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const qc = useQueryClient();
  const place = useServerFn(placeSportsBet);
  const value = Number(stake.replace(",", ".")) || 0;

  async function submit() {
    if (!selection) return;
    if (!user) return open("login");
    if (value <= 0) return toast.error("Informe o valor da aposta");
    setBusy(true);
    try {
      const { event, pick, odd } = selection;
      await place({ data: { matchId: event.id, pick, odd, stake: value, description: `${event.home.name} x ${event.away.name}` } });
      toast.success("Aposta registrada!");
      onClear();
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível apostar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside aria-label="Cupom de aposta" className="rounded-lg bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold">Cupom de aposta</h2>
      {!selection ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Clique numa odd para montar sua aposta.</p>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-md bg-surface-2 p-3 pr-9">
            <Button variant="ghost" size="icon" onClick={onClear} aria-label="Remover seleção" className="absolute right-1 top-1 size-7">
              <X className="size-4" />
            </Button>
            <p className="text-[11px] text-muted-foreground">{selection.event.leagueLabel}</p>
            <p className="text-[13px] font-semibold">{selection.event.home.name} x {selection.event.away.name}</p>
            <p className="mt-1 flex justify-between text-xs">
              <span>{PICK_LABEL[selection.pick]}</span>
              <span className="font-bold text-primary tabular-nums">{selection.odd.toFixed(2)}</span>
            </p>
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">
            Valor (R$)
            <Input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} className="mt-1" />
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[10, 20, 50, 100].map((v) => (
              <Button key={v} variant="secondary" size="sm" onClick={() => setStake(String(v))}>{v}</Button>
            ))}
          </div>
          <p className="flex justify-between text-xs">
            <span className="text-muted-foreground">Retorno possível</span>
            <span className="font-bold text-live tabular-nums">{brl(value * selection.odd)}</span>
          </p>
          <Button className="w-full font-bold" disabled={busy} onClick={submit}>
            {user ? (busy ? "Enviando..." : "Apostar") : "Entrar para apostar"}
          </Button>
        </div>
      )}
    </aside>
  );
}
