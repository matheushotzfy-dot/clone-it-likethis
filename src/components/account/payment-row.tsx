import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { KycDialog } from "@/components/auth/kyc-dialog";
import { formatBRL, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface Payment {
  id: string;
  type: string;
  status: string;
  amount: number;
  fee?: number;
  description: string | null;
  created_at: string;
  kyc_required?: boolean | null;
  kyc_submission?: { status: string; rejection_reason: string | null } | null;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Em análise", tone: "text-gold" },
  approved: { label: "Concluído", tone: "text-live" },
  completed: { label: "Concluído", tone: "text-live" },
  rejected: { label: "Recusado", tone: "text-destructive" },
  cancelled: { label: "Cancelado", tone: "text-muted-foreground" },
  failed: { label: "Falhou", tone: "text-destructive" },
};

export function PaymentRow({ payment: p }: { payment: Payment }) {
  const [kycOpen, setKycOpen] = useState(false);
  const deposit = p.type === "deposit";
  const s = STATUS[p.status] ?? { label: p.status, tone: "text-muted-foreground" };
  const pendingDeposit = deposit && p.status === "pending";
  const reason = p.description?.split(" — Motivo: ")[1];
  const needsKyc =
    !deposit &&
    p.status === "pending" &&
    p.kyc_required &&
    (!p.kyc_submission || p.kyc_submission.status === "rejected");
  const kycWaiting =
    !deposit && p.status === "pending" && p.kyc_required && p.kyc_submission?.status === "pending";

  return (
    <li className="py-3.5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-[10px]",
            deposit ? "bg-pix/12 text-pix" : "bg-surface-2 text-foreground/80",
          )}
        >
          {deposit ? (
            <ArrowDownToLine className="size-[18px]" />
          ) : (
            <ArrowUpFromLine className="size-[18px]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{deposit ? "Depósito Pix" : "Saque Pix"}</p>
          <p className="text-[13px] text-muted-foreground">{formatWhen(p.created_at)}</p>
          {!deposit && !!p.fee && p.fee > 0 && (
            <p className="num text-[13px] text-muted-foreground">
              Você recebe {formatBRL(p.amount - p.fee)} (taxa de {formatBRL(p.fee)})
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="num font-display text-[19px] font-bold">
            {deposit ? "+" : "-"}
            {formatBRL(p.amount)}
          </p>
          <p
            className={cn(
              "text-[13px] font-semibold",
              pendingDeposit ? "text-muted-foreground" : s.tone,
            )}
          >
            {pendingDeposit ? "Aguardando pagamento" : s.label}
          </p>
        </div>
      </div>
      {reason && p.status !== "approved" && (
        <p className="ml-[52px] mt-1.5 text-[13px] text-muted-foreground">
          Motivo: {reason}
          {p.type === "withdrawal" ? ". O valor voltou para o seu saldo." : ""}
        </p>
      )}
      {needsKyc && (
        <div className="ml-[52px] mt-2.5 rounded-[10px] border border-gold/40 bg-gold/10 p-3">
          <p className="text-[13.5px]">
            {p.kyc_submission?.status === "rejected"
              ? `Os documentos enviados foram recusados${p.kyc_submission.rejection_reason ? `: ${p.kyc_submission.rejection_reason}` : ""}. Envie de novo para liberar o saque.`
              : "Para liberar este saque, precisamos confirmar sua identidade."}
          </p>
          <button
            type="button"
            onClick={() => setKycOpen(true)}
            className="mt-2 h-9 rounded-[8px] bg-foreground px-4 text-[13.5px] font-bold text-background"
          >
            Enviar documentos
          </button>
        </div>
      )}
      {kycWaiting && (
        <p className="ml-[52px] mt-1.5 text-[13px] text-muted-foreground">
          Documentos recebidos. A análise costuma levar algumas horas.
        </p>
      )}
      {kycOpen && <KycDialog transactionId={p.id} open onClose={() => setKycOpen(false)} />}
    </li>
  );
}
