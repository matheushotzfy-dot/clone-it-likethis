import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthDialog } from "./auth-dialog-context";
import { ArrowLeft, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "@/lib/profile.functions";
import { getSettings } from "@/lib/settings.functions";
import { useAuth } from "@/hooks/use-auth";

const presets = [20, 50, 100, 250, 500, 1000];
const hots = new Set([50, 250, 1000]);

export function DepositDialog() {
  const { current, close } = useAuthDialog();
  const { user } = useAuth();
  const [amount, setAmount] = useState(50);
  const [step, setStep] = useState<"form" | "pix">("form");
  const create = useServerFn(createTransaction);
  const fetchSettings = useServerFn(getSettings);
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings(), enabled: !!user });
  const min = settings?.min_deposit ?? 20;
  const max = settings?.max_deposit ?? 10000;

  useEffect(() => { if (current === "deposit") { setStep("form"); setAmount(Math.max(min, 50)); } }, [current, min]);

  const mut = useMutation({
    mutationFn: () => create({ data: { type: "deposit", amount } }),
    onSuccess: () => {
      toast.success("Depósito criado! Aguardando confirmação.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setStep("pix");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fakePix = `00020126580014BR.GOV.BCB.PIX0136pixbet-${amount}-${Date.now().toString(36)}5204000053039865802BR5909PIXBET6009SAO PAULO62070503***6304ABCD`;

  return (
    <Dialog open={current === "deposit"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[520px] bg-popover border-white/10 text-white p-0 max-h-[95vh] overflow-y-auto">
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={step === "pix" ? () => setStep("form") : close} className="size-9 rounded-md hover:bg-white/10 flex items-center justify-center">
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold">Depositar</h2>
              <p className="text-xs text-white/60">Adicione saldo via PIX</p>
            </div>
          </div>

          {step === "form" ? (
            <>
              <div className="flex gap-2 mb-5 bg-brand-2/60 p-1 rounded-lg">
                <button className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-bold text-sm">PIX</button>
                <button disabled className="flex-1 h-10 rounded-md text-white/40 font-bold text-sm cursor-not-allowed">Cartão (em breve)</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Info label="Mínimo" value={`R$ ${min}`} />
                <Info label="Máximo" value={`R$ ${max}`} />
              </div>

              <div className="mb-2 text-sm font-semibold">Valor do depósito</div>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-sm font-bold">R$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-14 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white text-2xl font-black focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
                {presets.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`relative h-12 rounded-lg font-bold text-sm border-2 transition-all ${amount === v ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-brand-2/60 text-white hover:border-white/30"}`}
                  >
                    R$ {v.toLocaleString("pt-BR")}
                    {hots.has(v) && <span className="absolute -top-2 -right-1 text-[9px] font-black bg-yellow-400 text-black px-1.5 rounded">HOT</span>}
                  </button>
                ))}
              </div>

              <div className="bg-brand-2/50 rounded-lg p-3 mb-5 text-xs text-white/70 space-y-1.5">
                <div className="flex gap-2"><span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-[10px]">1</span> Confirme o valor</div>
                <div className="flex gap-2"><span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-[10px]">2</span> Pague o PIX no seu banco</div>
                <div className="flex gap-2"><span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-[10px]">3</span> Saldo creditado automaticamente</div>
              </div>

              <button
                onClick={() => mut.mutate()}
                disabled={mut.isPending || amount < min || amount > max}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-black uppercase text-sm hover:brightness-110 disabled:opacity-50"
              >
                {mut.isPending ? "Gerando PIX..." : `Depositar R$ ${amount}`}
              </button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-white rounded-xl p-4 inline-block">
                <QrCode className="size-48 text-black" strokeWidth={1.2} />
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-white/60">Pix copia e cola</div>
                <div className="bg-brand-2 rounded-lg p-3 text-[10px] font-mono break-all text-left mt-1">{fakePix}</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(fakePix); toast.success("Copiado!"); }}
                  className="mt-2 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold text-sm"
                >
                  <Copy className="size-4" /> Copiar código PIX
                </button>
              </div>
              <p className="text-xs text-white/60">Após o pagamento, o saldo aparece automaticamente. (Demo: aprovação manual pelo admin)</p>
              <button onClick={close} className="w-full h-11 rounded-md border border-white/20 text-white font-bold text-sm">Fechar</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold text-white/60">{label}</div>
      <div className="h-11 px-3 rounded-lg bg-brand-2 text-white flex items-center text-sm font-bold mt-1">{value}</div>
    </div>
  );
}
