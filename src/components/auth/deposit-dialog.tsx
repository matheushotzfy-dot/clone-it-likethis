import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthDialog } from "./auth-dialog-context";
import { ArrowLeft, Copy, QrCode, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, listMyTransactions } from "@/lib/profile.functions";
import { createPodPayPixDeposit } from "@/lib/podpay.functions";
import { createBSPayPixDeposit } from "@/lib/bspay.functions";
import { createVeoPagPixDeposit } from "@/lib/veopag.functions";
import { getSettings } from "@/lib/settings.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const presets = [30, 50, 100, 250, 500, 1000];
const hots = new Set([50, 250, 1000]);

export function DepositDialog() {
  const { current, close, open: openDialog } = useAuthDialog();
  const { user, loading: authLoading } = useAuth();
  const [amount, setAmount] = useState(0);
  const [step, setStep] = useState<"form" | "pix">("form");
  const [pix, setPix] = useState<{ qrCodeImage: string; copyPaste: string; transactionId: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const createPixPod = useServerFn(createPodPayPixDeposit);
  const createPixBs = useServerFn(createBSPayPixDeposit);
  const createPixVeo = useServerFn(createVeoPagPixDeposit);
  const fetchSettings = useServerFn(getSettings);
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTransactions = useServerFn(listMyTransactions);
  const qc = useQueryClient();
  const open = current === "deposit";

  // Gate: must be logged in to deposit
  useEffect(() => {
    if (open && !authLoading && !user) {
      openDialog("register");
    }
  }, [open, authLoading, user, openDialog]);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings(), enabled: !!user && open });
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user && open,
    refetchInterval: open ? 5000 : false,
  });
  const { data: txs } = useQuery({
    queryKey: ["my-tx"],
    queryFn: () => fetchTransactions(),
    enabled: !!user && open && step === "pix" && !!pix,
    refetchInterval: 3000,
  });
  const min = settings?.min_deposit ?? 30;
  const max = settings?.max_deposit ?? 3000;

  // Auto-close on approval
  useEffect(() => {
    if (step !== "pix" || !pix || !txs) return;
    const found = txs.find((t: { id: string; status: string }) => t.id === pix.transactionId);
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

  useEffect(() => {
    if (open) {
      setStep("form");
      setPix(null);
      setPixCopied(false);
      setAmount(0);
    }
  }, [open, min]);

  const mut = useMutation({
    mutationFn: async (): Promise<{ transactionId: string; qrCodeImage: string; copyPaste: string }> => {
      const g = settings?.active_gateway;
      if (g === "bspay") return createPixBs({ data: { amount } });
      if (g === "podpay") return createPixPod({ data: { amount } });
      return createPixVeo({ data: { amount } });
    },
    onSuccess: (res) => {
      if (!res.copyPaste) {
        toast.error("Falha ao gerar PIX. Tente novamente.");
        return;
      }
      setPix({ qrCodeImage: res.qrCodeImage, copyPaste: res.copyPaste, transactionId: res.transactionId });
      setPixCopied(false);
      toast.success("PIX gerado! Pague para creditar o saldo.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setStep("pix");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao gerar PIX"),
  });

  const showDialog = open && !!user;
  return (
    <Dialog open={showDialog} onOpenChange={(o) => !o && (step !== "pix" || pixCopied) && close()}>
      <DialogContent className="max-w-[440px] w-[calc(100vw-2.5rem)] sm:w-full bg-brand border-white/10 text-white p-0 overflow-hidden shadow-2xl max-h-[88vh] sm:max-h-[92vh] flex flex-col sm:rounded-2xl rounded-2xl">
        <DialogTitle className="sr-only">Depósito via PIX</DialogTitle>
        <DialogDescription className="sr-only">Gere um QR Code PIX para depositar na sua conta</DialogDescription>
        <div className="relative flex flex-col min-h-0 flex-1">
          <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-brand-2/50 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={step === "pix" ? () => pixCopied && setStep("form") : close}
                disabled={step === "pix" && !pixCopied}
                className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={step === "pix" && !pixCopied ? "Copie o PIX antes de voltar" : "Voltar"}
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">Depositar</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-wider">
                  <Zap className="size-3 fill-primary" />
                  Processamento Instantâneo
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {step === "form" ? (
              <div className="space-y-5">
                {profile?.is_frozen && (
                  <div className="rounded-xl border-2 border-red-500/60 bg-red-500/15 p-4 text-left">
                    <div className="font-black text-red-300 uppercase text-xs tracking-widest">⚠️ Conta congelada</div>
                    <p className="mt-1 text-sm text-red-100 leading-snug">
                      {profile.freeze_reason ? `Motivo: ${profile.freeze_reason}` : "Sua conta está bloqueada. Entre em contato com o suporte."}
                    </p>
                  </div>
                )}
                <div className="p-1 bg-brand-2 rounded-xl border border-white/5">
                  <button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg">PIX</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-brand-2/40 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Mínimo</div>
                    <div className="text-sm font-black text-white">R$ {min.toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="p-3 bg-brand-2/40 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Máximo</div>
                    <div className="text-sm font-black text-white">R$ {max.toLocaleString("pt-BR")}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-widest ml-1">Valor do Depósito</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-colors" />
                    <div className="relative flex items-center bg-brand-2 border-2 border-white/5 group-focus-within:border-primary rounded-2xl transition-all h-20 px-6">
                      <span className="text-2xl font-black text-primary mr-3">R$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amount || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0,00"
                        className="w-full bg-transparent text-4xl font-black text-white focus:outline-none placeholder:text-white/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {presets.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(v)}
                      className={cn(
                        "relative h-14 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center overflow-hidden",
                        amount === v
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-5px_rgba(255,215,0,0.3)]"
                          : "border-white/5 bg-brand-2/60 text-white/60 hover:border-white/20 hover:text-white",
                      )}
                    >
                      R$ {v}
                      {hots.has(v) && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter">
                            Hot
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>Pagamento processado via <span className="font-bold text-white">PIX Seguro</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <ShieldCheck className="size-4 text-primary shrink-0" />
                    <span>Seus fundos estão protegidos pela <span className="font-bold text-white">APOSTAYA.BET</span></span>
                  </div>
                </div>

                <button
                  onClick={() => mut.mutate()}
                  disabled={mut.isPending || amount < min || amount > max || !!profile?.is_frozen}
                  className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-base tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {profile?.is_frozen ? "Conta congelada" : mut.isPending ? "Processando..." : `Gerar PIX de R$ ${amount.toLocaleString("pt-BR")}`}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-5 py-2 sm:py-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Pagamento Pendente</h3>
                  <p className="text-sm text-white/60">Copie o PIX copia e cola para liberar a conclusão.</p>
                </div>

                <div className="relative inline-block group">
                  <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-3xl" />
                  <div className="relative bg-white rounded-[2rem] p-4 sm:p-6 shadow-2xl">
                    {pix?.qrCodeImage ? (
                      <img src={pix.qrCodeImage} alt="QR Code PIX" className="size-48 sm:size-56" />
                    ) : pix?.copyPaste ? (
                      <QRCodeSVG value={pix.copyPaste} size={224} level="M" className="size-48 sm:size-56" />
                    ) : (
                      <QrCode className="size-48 sm:size-56 text-black" strokeWidth={1.5} />
                    )}
                    <div className="absolute -top-8 -right-8 bg-primary text-primary-foreground size-12 rounded-full flex items-center justify-center shadow-lg border-4 border-brand">
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
                      onClick={async () => {
                        if (!pix?.copyPaste) return;
                        const text = pix.copyPaste;
                        let ok = false;
                        try {
                          if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(text);
                            ok = true;
                          }
                        } catch {
                          ok = false;
                        }
                        if (!ok) {
                          // Fallback for in-app browsers (Instagram, TikTok, etc.)
                          try {
                            const ta = document.createElement("textarea");
                            ta.value = text;
                            ta.setAttribute("readonly", "");
                            ta.style.position = "fixed";
                            ta.style.top = "0";
                            ta.style.left = "0";
                            ta.style.opacity = "0";
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.select();
                            ta.setSelectionRange(0, text.length);
                            ok = document.execCommand("copy");
                            document.body.removeChild(ta);
                          } catch {
                            ok = false;
                          }
                        }
                        setPixCopied(true); // libera o fluxo de qualquer forma
                        if (ok) {
                          toast.success("PIX copia e cola copiado! Agora é só pagar.");
                        } else {
                          toast.warning("Não consegui copiar automaticamente. Segure o código acima e copie manualmente.");
                        }
                      }}
                      className="mt-3 w-full min-h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-2 px-3 text-sm font-black uppercase tracking-wide hover:brightness-110 transition-all shadow-lg active:scale-[0.98]"
                    >
                      {pixCopied ? <CheckCircle2 className="size-5" /> : <Copy className="size-5" />}
                      {pixCopied ? "PIX copiado" : "Copiar PIX copia e cola"}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-white/50">Depois de copiar, pague no seu banco. A confirmação é automática.</p>
                <button
                  onClick={close}
                  disabled={!pixCopied}
                  className="w-full h-14 rounded-2xl bg-white/5 text-white/60 hover:text-white font-bold uppercase text-sm tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pixCopied ? "Concluir e Voltar" : "Copie o PIX para concluir"}
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
