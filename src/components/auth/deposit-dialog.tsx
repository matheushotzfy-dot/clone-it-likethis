import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { listMyTransactions } from "@/lib/profile.functions";
import { createPodPayPixDeposit } from "@/lib/podpay.functions";
import { createBSPayPixDeposit } from "@/lib/bspay.functions";
import { createVeoPagPixDeposit, syncMyVeoPagDeposit } from "@/lib/veopag.functions";
import { canDismissDeposit } from "@/lib/deposit-navigation";
import { formatBRL, parseBRL } from "@/lib/format";
import { usePublicSettings, useRefreshMoney, useWallet } from "@/hooks/use-account";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthDialog } from "./auth-dialog-context";
import { AuthSheet } from "./auth-sheet";

const PRESETS = [30, 50, 100, 200, 500, 1000];

/** Copia mesmo dentro de navegadores de app (Instagram, TikTok), onde a API de clipboard falha. */
async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cai no plano B */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function DepositDialog() {
  const { current, close, open: openDialog } = useAuthDialog();
  const { user, loading: authLoading } = useAuth();
  const isOpen = current === "deposit";
  const settings = usePublicSettings();
  const wallet = useWallet();
  const refresh = useRefreshMoney();

  const [raw, setRaw] = useState("");
  const [pix, setPix] = useState<{
    copyPaste: string;
    qrCodeImage: string;
    transactionId: string;
    amount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const createVeo = useServerFn(createVeoPagPixDeposit);
  const createPod = useServerFn(createPodPayPixDeposit);
  const createBs = useServerFn(createBSPayPixDeposit);
  const syncVeo = useServerFn(syncMyVeoPagDeposit);
  const fetchTxs = useServerFn(listMyTransactions);

  useEffect(() => {
    if (isOpen && !authLoading && !user) openDialog("register");
  }, [isOpen, authLoading, user, openDialog]);
  useEffect(() => {
    if (isOpen) {
      setPix(null);
      setRaw("");
      setCopied(false);
    }
  }, [isOpen]);

  const s = settings.data;
  const min = s?.minDeposit ?? 30;
  const max = s?.maxDeposit ?? 3000;
  const amount = parseBRL(raw);
  const blocked = wallet.data?.frozen || !!wallet.data?.selfExcludedUntil;

  // Enquanto o QR está na tela, confere o pagamento a cada 3s.
  const status = useQuery({
    queryKey: ["deposit-status", pix?.transactionId],
    queryFn: async () => {
      if (s?.activeGateway === "veopag" && pix)
        await syncVeo({ data: { transactionId: pix.transactionId } }).catch(() => null);
      const txs = await fetchTxs();
      return txs.find((t: { id: string }) => t.id === pix?.transactionId)?.status ?? "pending";
    },
    enabled: isOpen && !!pix,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!pix || !status.data) return;
    if (status.data === "approved") {
      toast.success(`Depósito de ${formatBRL(pix.amount)} confirmado`, {
        description: "O valor já está no seu saldo.",
      });
      refresh();
      close();
    } else if (status.data === "rejected") {
      toast.error("O Pix expirou ou foi recusado. Gere um novo.");
      setPix(null);
    }
  }, [status.data, pix, refresh, close]);

  const create = useMutation({
    mutationFn: async () => {
      const g = s?.activeGateway;
      const res =
        g === "bspay"
          ? await createBs({ data: { amount } })
          : g === "podpay"
            ? await createPod({ data: { amount } })
            : await createVeo({ data: { amount } });
      return res as { transactionId: string; qrCodeImage: string; copyPaste: string };
    },
    onSuccess: (res) => {
      if (!res.copyPaste) {
        toast.error("O Pix não foi gerado. Tente de novo.");
        return;
      }
      setPix({ ...res, amount });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível gerar o Pix."),
  });

  const invalid = amount > 0 && (amount < min || amount > max);

  return (
    <AuthSheet
      open={isOpen && !!user}
      onOpenChange={(o) => canDismissDeposit(o) && close()}
      title={pix ? "Pague com Pix" : "Depositar"}
      description={
        pix
          ? `Depósito de ${formatBRL(pix.amount)}. O saldo entra assim que o banco confirmar.`
          : "Pix na hora, direto do app do seu banco."
      }
      width={440}
    >
      {s && !s.realMoney ? (
        <div className="space-y-4">
          <p className="rounded-[10px] border border-border bg-surface p-4 text-[14.5px] leading-relaxed">
            A plataforma está em homologação e ainda não recebe depósitos com dinheiro real. Assim
            que for liberada, esta tela gera o Pix normalmente.
          </p>
          <Button
            variant="secondary"
            className="h-11 w-full rounded-[10px] shadow-none"
            onClick={close}
          >
            Entendi
          </Button>
        </div>
      ) : blocked ? (
        <div className="space-y-4">
          <p className="rounded-[10px] border border-destructive/40 bg-destructive/10 p-4 text-[14.5px] leading-relaxed">
            {wallet.data?.frozen
              ? "Sua conta está suspensa e não pode receber depósitos. Fale com o suporte."
              : "Sua autoexclusão está ativa. Depósitos voltam quando o período terminar."}
          </p>
          <Button
            variant="secondary"
            className="h-11 w-full rounded-[10px] shadow-none"
            onClick={close}
          >
            Fechar
          </Button>
        </div>
      ) : !pix ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (amount >= min && amount <= max) create.mutate();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold">Valor</span>
            <span
              className={cn(
                "flex h-[68px] items-center rounded-[12px] border bg-surface px-4 transition-colors focus-within:border-pix",
                invalid ? "border-destructive" : "border-input",
              )}
            >
              <span className="mr-2 font-display text-[26px] font-bold text-muted-foreground">
                R$
              </span>
              <input
                value={raw}
                onChange={(e) => setRaw(e.target.value.replace(/[^\d,]/g, ""))}
                inputMode="decimal"
                placeholder="0,00"
                aria-describedby="deposit-limits"
                className="num w-full min-w-0 bg-transparent font-display text-[38px] font-bold outline-none placeholder:text-muted-foreground/50"
              />
            </span>
            <span
              id="deposit-limits"
              className={cn(
                "mt-1.5 block text-[13px]",
                invalid ? "text-destructive" : "text-muted-foreground",
              )}
            >
              Mínimo {formatBRL(min)} e máximo {formatBRL(max)} por Pix.
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {PRESETS.filter((v) => v >= min && v <= max).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRaw(String(v))}
                data-active={amount === v}
                className="num h-12 rounded-[10px] border border-border bg-surface font-display text-[19px] font-bold transition-colors hover:border-pix/60 data-[active=true]:border-pix data-[active=true]:bg-pix/10"
              >
                {v.toLocaleString("pt-BR")}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={create.isPending || amount < min || amount > max}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-pix text-[16px] font-bold text-pix-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : amount > 0 ? (
              `Gerar Pix de ${formatBRL(amount)}`
            ) : (
              "Escolha um valor"
            )}
          </button>
          <p className="text-center text-[12.5px] text-muted-foreground">
            O Pix precisa sair de uma conta no seu CPF.{" "}
            <Link
              to="/perfil"
              search={{ aba: "limites" } as never}
              onClick={close}
              className="underline"
            >
              Definir limite de depósito
            </Link>
          </p>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="mx-auto w-fit rounded-[14px] bg-qr-paper p-4">
            {pix.qrCodeImage ? (
              <img src={pix.qrCodeImage} alt="QR Code do Pix" className="size-52" />
            ) : (
              <QRCodeSVG value={pix.copyPaste} size={208} level="M" />
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[13.5px] font-semibold">Pix copia e cola</p>
            <p className="thin-scrollbar max-h-20 overflow-y-auto break-all rounded-[10px] border border-border bg-surface p-3 font-mono text-[12px] leading-relaxed text-muted-foreground">
              {pix.copyPaste}
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              const ok = await copyText(pix.copyPaste);
              if (ok) {
                setCopied(true);
                toast.success("Código copiado. Cole no app do seu banco.");
                setTimeout(() => setCopied(false), 3000);
              } else toast.error("Não deu para copiar. Selecione o código e copie manualmente.");
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-pix text-[16px] font-bold text-pix-foreground hover:brightness-110"
          >
            {copied ? (
              <>
                <Check className="size-5" /> Copiado
              </>
            ) : (
              <>
                <Copy className="size-5" /> Copiar código
              </>
            )}
          </button>

          <div
            className="flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" /> Aguardando o pagamento
          </div>

          <button
            type="button"
            onClick={() => setPix(null)}
            className="mx-auto flex items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Mudar o valor
          </button>
          <p className="text-center text-[12.5px] text-muted-foreground">
            Pode fechar esta janela: o saldo entra mesmo assim quando o pagamento cair. Saldo atual:{" "}
            {formatBRL(wallet.data?.balance)}.
          </p>
        </div>
      )}
    </AuthSheet>
  );
}
