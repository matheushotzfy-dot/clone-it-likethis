import { Button } from "@/components/ui/button";
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
import { createVeoPagPixDeposit, syncMyVeoPagDeposit } from "@/lib/veopag.functions";
import { getSettings } from "@/lib/settings.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { canDismissDeposit } from "@/lib/deposit-navigation";

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
  const syncVeo = useServerFn(syncMyVeoPagDeposit);
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
    queryFn: async () => {
      // Confirm with VeoPag directly in case the webhook is delayed.
      if (pix?.transactionId) await syncVeo({ data: { transactionId: pix.transactionId } }).catch(() => null);
      return fetchTransactions();
    },
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
    <Dialog open={showDialog} onOpenChange={(o) => canDismissDeposit(o) && close()}>
      <DialogContent className="auth-sheet deposit-sheet flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[460px] flex-col overflow-hidden rounded-lg border-border bg-background p-0 text-foreground shadow-2xl sm:w-full">
        <DialogTitle className="sr-only">Depósito via PIX</DialogTitle>
        <DialogDescription className="sr-only">Gere um QR Code PIX para depositar na sua conta</DialogDescription>
        <div className="relative flex flex-col min-h-0 flex-1">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface/70 p-4 pr-16 sm:p-6 sm:pr-16">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost"
                onClick={step === "pix" ? () => setStep("form") : close}
                className="size-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition-colors border border-border shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-normal">Depositar</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-normal">
                  <Zap className="size-3 fill-primary" />
                  Processamento Instantâneo
                </div>
              </div>
            </div>
          </div>

          <div className="auth-sheet-scroll p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {step === "form" ? (
              <div className="space-y-5">
                {profile?.is_frozen && (
                  <div className="rounded-lg border-2 border-destructive/60 bg-destructive/15 p-4 text-left">
                    <div className="font-black text-destructive uppercase text-xs tracking-normal">⚠️ Conta congelada</div>
                    <p className="mt-1 text-sm text-destructive leading-snug">
                      {profile.freeze_reason ? `Motivo: ${profile.freeze_reason}` : "Sua conta está bloqueada. Entre em contato com o suporte."}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-1">
                  <div className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-xs font-black uppercase text-primary-foreground shadow-lg"><Zap className="size-4" /> PIX instantâneo</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-brand-2/40 rounded-lg border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Mínimo</div>
                    <div className="text-sm font-black text-foreground">R$ {min.toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="p-3 bg-brand-2/40 rounded-lg border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Máximo</div>
                    <div className="text-sm font-black text-foreground">R$ {max.toLocaleString("pt-BR")}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="deposit-amount" className="text-xs font-bold text-muted-foreground uppercase tracking-normal ml-1">Valor do Depósito</label>
                  <div className="relative group">
                    <div className="relative flex h-20 items-center rounded-lg border-2 border-border bg-surface/70 px-6 transition-all group-focus-within:border-primary">
                      <span className="text-2xl font-black text-primary mr-3">R$</span>
                      <input
                        id="deposit-amount"
                        type="number"
                        inputMode="decimal"
                        value={amount || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0,00"
                        className="min-w-0 w-full bg-transparent text-3xl sm:text-4xl font-black text-foreground focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {presets.map((v) => (
                    <Button variant="ghost"
                      key={v}
                      aria-label={`R$ ${v}`}
                      onClick={() => setAmount(v)}
                      className={cn(
                        "relative h-14 rounded-lg font-black text-sm transition-all border-2 flex items-center justify-center overflow-hidden",
                        amount === v
                          ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                          : "border-border bg-surface/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      R$ {v}
                      {hots.has(v) && (
                        <div className="absolute top-0 right-0">
                          <div aria-hidden="true" className="bg-primary text-primary-foreground text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase">
                            PIX
                          </div>
                        </div>
                      )}
                    </Button>
                  ))}
                </div>

                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>Pagamento processado via <span className="font-bold text-foreground">PIX Seguro</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary shrink-0" />
                    <span>Seus fundos estão protegidos pela <span className="font-bold text-foreground">apostamaxy</span></span>
                  </div>
                </div>

                <Button variant="ghost"
                  onClick={() => mut.mutate()}
                  disabled={mut.isPending || amount < min || amount > max || !!profile?.is_frozen}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-black uppercase text-base tracking-normal hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {profile?.is_frozen ? "Conta congelada" : mut.isPending ? "Processando..." : `Gerar PIX de R$ ${amount.toLocaleString("pt-BR")}`}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-5 py-2 sm:py-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-normal">Pagamento Pendente</h3>
                  <p className="text-sm text-muted-foreground">Pague pelo QR Code ou pelo código PIX.</p>
                </div>

                <div className="relative inline-block group">
                  <div className="relative bg-qr-paper rounded-lg p-4 sm:p-6 shadow-2xl">
                    {pix?.qrCodeImage ? (
                      <img src={pix.qrCodeImage} alt="QR Code PIX" className="size-48 sm:size-56" />
                    ) : pix?.copyPaste ? (
                      <QRCodeSVG value={pix.copyPaste} size={224} level="M" className="size-48 sm:size-56" />
                    ) : (
                      <QrCode className="size-48 sm:size-56 text-primary-foreground" strokeWidth={1.5} />
                    )}
                    <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground size-12 rounded-full flex items-center justify-center shadow-lg border-4 border-brand">
                      <Zap className="size-6 fill-current" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] uppercase font-black text-muted-foreground tracking-normal">Pix Copia e Cola</div>
                  <div className="relative group">
                    <div className="bg-brand-2 rounded-lg p-5 text-[11px] font-mono break-all text-left text-muted-foreground border border-border max-h-24 overflow-y-auto custom-scrollbar leading-relaxed">
                      {pix?.copyPaste || "Gerando..."}
                    </div>
                    <Button variant="ghost"
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
                      className="mt-3 w-full min-h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 px-3 text-sm font-black tracking-normal hover:brightness-110 transition-all shadow-lg active:scale-[0.98]"
                    >
                      {pixCopied ? <CheckCircle2 className="size-5" /> : <Copy className="size-5" />}
                      {pixCopied ? "PIX copiado" : "Copiar PIX copia e cola"}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">Depois de copiar, pague no seu banco. A confirmação é automática.</p>
                <Button variant="ghost"
                  onClick={close}
                  className="w-full h-14 rounded-lg bg-surface text-muted-foreground hover:text-foreground font-bold uppercase text-sm tracking-normal disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Voltar ao cassino
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
