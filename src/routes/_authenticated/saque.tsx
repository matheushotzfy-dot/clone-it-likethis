import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTransaction, getMyProfile } from "@/lib/profile.functions";
import { getSettings } from "@/lib/settings.functions";
import { toast } from "sonner";
import { ArrowUpFromLine, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/saque")({
  head: () => ({ meta: [{ title: "Saque — PIXBET" }] }),
  component: Page,
});

const presets = [50, 100, 250, 500, 1000];
const keyTypes = ["CPF", "E-mail", "Telefone", "Aleatória"] as const;

function Page() {
  const [amount, setAmount] = useState(50);
  const [pixKey, setPixKey] = useState("");
  const [keyType, setKeyType] = useState<typeof keyTypes[number]>("CPF");
  const create = useServerFn(createTransaction);
  const profileFn = useServerFn(getMyProfile);
  const settingsFn = useServerFn(getSettings);
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => profileFn() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => settingsFn() });
  const balance = Number(profile?.balance ?? 0);
  const min = settings?.min_withdraw ?? 50;
  const max = settings?.max_withdraw ?? 5000;
  const fee = settings?.withdrawal_fee_pct ?? 0;
  const feeAmount = amount * (fee / 100);
  const net = amount - feeAmount;

  useEffect(() => { setAmount(min); }, [min]);

  const mut = useMutation({
    mutationFn: () => create({ data: { type: "withdrawal", amount, pix_key: `${keyType}: ${pixKey}` } }),
    onSuccess: () => {
      toast.success("Saque solicitado! Análise em até 24h.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setPixKey("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteShell>
      <div className="max-w-2xl mx-auto px-3 md:px-6 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <ArrowUpFromLine className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Solicitar Saque</h1>
        </div>

        <div className="bg-gradient-to-br from-primary/20 to-surface border border-primary/30 rounded-2xl p-5">
          <div className="text-xs uppercase font-bold text-muted-foreground">Saldo disponível</div>
          <div className="text-4xl font-black text-primary">R$ {balance.toFixed(2).replace(".", ",")}</div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!pixKey) return toast.error("Informe sua chave PIX");
            if (amount > balance) return toast.error("Saldo insuficiente");
            mut.mutate();
          }}
          className="bg-surface border border-border rounded-2xl p-5 md:p-6 space-y-5"
        >
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Tipo de chave</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {keyTypes.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKeyType(k)}
                  className={`h-10 rounded-md text-xs font-bold transition-all ${keyType === k ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Chave PIX</label>
            <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder={keyType === "E-mail" ? "voce@email.com" : keyType === "CPF" ? "000.000.000-00" : "Digite a chave"} className="mt-1 bg-surface-2 h-12" />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Valor a sacar</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
              <Input type="number" min={min} max={max} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-surface-2 h-14 pl-10 text-2xl font-black" />
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => setAmount(p)} className={`h-9 rounded-md text-xs font-bold border ${amount === p ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  R$ {p}
                </button>
              ))}
            </div>
          </div>

          {fee > 0 && (
            <div className="bg-surface-2 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Valor solicitado</span><span>R$ {amount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa ({fee}%)</span><span className="text-destructive">- R$ {feeAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>Receberá</span><span className="text-primary">R$ {net.toFixed(2)}</span></div>
            </div>
          )}

          <div className="bg-surface-2 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <span>Saque mínimo R$ {min} · máximo R$ {max}. Processamento em até 24h. A chave PIX deve estar no seu CPF.</span>
          </div>

          <Button type="submit" disabled={mut.isPending} className="w-full font-black h-12 uppercase">
            {mut.isPending ? "Solicitando..." : `Sacar R$ ${amount}`}
          </Button>
          <Link to="/historico" className="block text-center text-sm text-primary hover:underline">Ver histórico de saques</Link>
        </form>
      </div>
    </SiteShell>
  );
}
