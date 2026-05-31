import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthDialog } from "./auth-dialog-context";
import { ArrowLeft, Copy, QrCode, CheckCircle2, ShieldCheck, Zap, Gift, Clock } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, listMyTransactions } from "@/lib/profile.functions";
import { createPodPayPixDeposit } from "@/lib/podpay.functions";
import { getSettings } from "@/lib/settings.functions";
import { useAuth } from "@/hooks/use-auth";
import { maskCPF, validateCPF } from "@/lib/validations";
import { cn } from "@/lib/utils";

const presets = [20, 50, 100, 250, 500, 1000];
const hots = new Set([50, 250, 1000]);

export function DepositDialog() {
  const { current, close } = useAuthDialog();
  const { user } = useAuth();
  const [amount, setAmount] = useState(50);
  const [cpfInput, setCpfInput] = useState("");
  const [step, setStep] = useState<"form" | "pix">("form");
  const [pix, setPix] = useState<{ qrCodeImage: string; copyPaste: string; transactionId: string } | null>(null);
  const createPix = useServerFn(createPodPayPixDeposit);
  const fetchSettings = useServerFn(getSettings);
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTransactions = useServerFn(listMyTransactions);
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings(), enabled: !!user });
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile(), enabled: !!user && current === "deposit", refetchInterval: 4000 });
  const { data: txs } = useQuery({
    queryKey: ["my-tx"],
    queryFn: () => fetchTransactions(),
    enabled: !!user && current === "deposit" && step === "pix" && !!pix,
    refetchInterval: 3000,
  });
  const min = settings?.min_deposit ?? 20;
  const max = settings?.max_deposit ?? 10000;
  const profileCpf = (profile?.cpf || "").replace(/\D/g, "");
  const hasCpfOnFile = profileCpf.length === 11;
  const needsCpf = !profileLoading && !hasCpfOnFile;
  const cpfValid = hasCpfOnFile || validateCPF(cpfInput);

  // Auto-close when the generated PIX is approved
  useEffect(() => {
    if (step !== "pix" || !pix || !txs) return;
    const found = txs.find((t: any) => t.id === pix.transactionId);
    if (found && found.status === "approved") {
      toast.success("Pagamento confirmado! Saldo creditado.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      close();
    } else if (found && found.status === "rejected") {
      toast.error("Pagamento recusado.");
      close();
    }
  }, [txs, step, pix, qc, close]);

  // Bonus countdown
  const bonusExpiresAt = profile?.bonus_expires_at ? new Date(profile.bonus_expires_at).getTime() : 0;
  const bonusUsed = !!profile?.bonus_used;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (current !== "deposit" || !bonusExpiresAt || bonusUsed) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [current, bonusExpiresAt, bonusUsed]);
  const msLeft = Math.max(0, bonusExpiresAt - now);
  const bonusActive = !bonusUsed && msLeft > 0;
  const mm = Math.floor(msLeft / 60000);
  const ss = Math.floor((msLeft % 60000) / 1000);

  useEffect(() => { 
    if (current === "deposit") { 
      setStep("form"); 
      setPix(null);
      setCpfInput("");
      setAmount(Math.max(min, 50)); 
    } 
  }, [current, min]);

  const mut = useMutation({
    mutationFn: () => createPix({ data: { amount, cpf: hasCpfOnFile ? undefined : cpfInput.replace(/\D/g, "") } }),
    onSuccess: (res) => {
      if (!res.copyPaste) {
        toast.error("Falha ao gerar PIX. Tente novamente.");
        return;
      }
      setPix({ qrCodeImage: res.qrCodeImage, copyPaste: res.copyPaste });
      toast.success("PIX gerado! Pague para creditar o saldo.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setStep("pix");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao gerar PIX"),
  });

  return (
    <Dialog open={current === "deposit"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[500px] w-full bg-brand border-white/10 text-white p-0 overflow-hidden shadow-2xl">
        <div className="relative">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-brand-2/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={step === "pix" ? () => setStep("form") : close} 
                className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Depositar</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-wider">
                  <Zap className="size-3 fill-primary" />
                  Processamento Instantâneo
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {step === "form" ? (
              <div className="space-y-6">
                {/* Bonus Banner */}
                {bonusActive && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-4">
                    <div className="absolute -top-8 -right-8 size-32 bg-primary/20 rounded-full blur-2xl" />
                    <div className="relative flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg">
                        <Gift className="size-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary">Oferta exclusiva</div>
                        <div className="text-sm font-black text-white leading-tight">100% de Bônus · Sem Rollover · Saque ou Jogue</div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 border border-primary/30 rounded-lg px-2.5 py-1.5">
                        <Clock className="size-3.5 text-primary" />
                        <span className="font-mono text-sm font-black text-primary tabular-nums">
                          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {bonusUsed && (
                  <div className="rounded-xl border border-white/5 bg-brand-2/40 p-3 text-xs text-white/60 text-center">
                    Bônus de boas-vindas já utilizado.
                  </div>
                )}

                {/* Method Selector - PIX Only */}
                <div className="p-1 bg-brand-2 rounded-xl border border-white/5">
                  <button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg">PIX</button>
                </div>

                {/* Limits Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-brand-2/40 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Mínimo</div>
                    <div className="text-sm font-black text-white">R$ {min.toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="p-3 bg-brand-2/40 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Máximo</div>
                    <div className="text-sm font-black text-white">R$ {max.toLocaleString('pt-BR')}</div>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-widest ml-1">Valor do Depósito</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-colors" />
                    <div className="relative flex items-center bg-brand-2 border-2 border-white/5 group-focus-within:border-primary rounded-2xl transition-all h-20 px-6">
                      <span className="text-2xl font-black text-primary mr-3">R$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amount || ''}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0,00"
                        className="w-full bg-transparent text-4xl font-black text-white focus:outline-none placeholder:text-white/10"
                      />
                    </div>
                  </div>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {presets.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(v)}
                      className={cn(
                        "relative h-14 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center overflow-hidden",
                        amount === v 
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-5px_rgba(255,215,0,0.3)]" 
                          : "border-white/5 bg-brand-2/60 text-white/60 hover:border-white/20 hover:text-white"
                      )}
                    >
                      R$ {v}
                      {hots.has(v) && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded-bl-lg transform uppercase tracking-tighter">
                            Hot
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* CPF fallback (only if not on file) */}
                {needsCpf && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-widest ml-1">CPF do titular</label>
                    <input
                      value={cpfInput}
                      onChange={(e) => setCpfInput(maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      className="w-full h-12 px-4 rounded-xl bg-brand-2 border-2 border-white/5 focus:border-primary text-white placeholder:text-white/30 focus:outline-none text-base"
                    />
                    {cpfInput.length > 0 && !validateCPF(cpfInput) && (
                      <p className="text-xs text-destructive ml-1">CPF inválido</p>
                    )}
                  </div>
                )}

                {/* Trust Badges */}
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>Pagamento processado via <span className="font-bold text-white">PIX Seguro</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <ShieldCheck className="size-4 text-primary shrink-0" />
                    <span>Seus fundos estão protegidos pela <span className="font-bold text-white">PIXBET</span></span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => mut.mutate()}
                  disabled={mut.isPending || amount < min || amount > max || !cpfValid || profileLoading}
                  className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-base tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {mut.isPending ? "Processando..." : profileLoading ? "Carregando..." : `Gerar PIX de R$ ${amount.toLocaleString('pt-BR')}`}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-8 py-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Pagamento Pendente</h3>
                  <p className="text-sm text-white/60">Escaneie o QR Code ou copie a chave abaixo</p>
                </div>

                <div className="relative inline-block group">
                  <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-3xl group-hover:bg-primary/30 transition-colors" />
                  <div className="relative bg-white rounded-[2rem] p-6 shadow-2xl">
                    {pix?.qrCodeImage ? (
                      <img src={pix.qrCodeImage} alt="QR Code PIX" className="size-56" />
                    ) : (
                      <QrCode className="size-56 text-black" strokeWidth={1.5} />
                    )}
                    <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground size-12 rounded-full flex items-center justify-center shadow-lg border-4 border-brand">
                      <Zap className="size-6 fill-current" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] uppercase font-black text-white/40 tracking-widest">Pix Copia e Cola</div>
                  <div className="relative group">
                    <div className="bg-brand-2 rounded-2xl p-5 text-[11px] font-mono break-all text-left text-white/80 border border-white/10 max-h-24 overflow-y-auto custom-scrollbar leading-relaxed">
                      {pix?.copyPaste || "Gerando..."}
                    </div>
                    <button
                      onClick={() => { 
                        if (!pix?.copyPaste) return;
                        navigator.clipboard.writeText(pix.copyPaste); 
                        toast.success("Código PIX copiado!"); 
                      }}
                      className="absolute right-3 bottom-3 size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-all shadow-lg active:scale-95"
                    >
                      <Copy className="size-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      toast.info("Aguardando confirmação do banco...");
                    }}
                    className="w-full h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 font-black uppercase text-sm tracking-wider"
                  >
                    Já realizei o pagamento
                  </button>
                  <button 
                    onClick={close} 
                    className="w-full h-14 rounded-2xl bg-white/5 text-white/60 hover:text-white font-bold uppercase text-sm tracking-wider"
                  >
                    Concluir e Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

