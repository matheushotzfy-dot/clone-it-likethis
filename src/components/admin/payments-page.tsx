import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listPayments, recheckDeposit, setTransactionStatus } from "@/lib/admin.functions";
import { requestKycForTransaction } from "@/lib/kyc.functions";
import {
  Empty,
  ErrorBox,
  Money,
  PageHeader,
  Pager,
  Panel,
  PlayerLink,
  Segmented,
  StatusPill,
  Table,
  Td,
} from "./ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatBRL, formatDateTime } from "@/lib/format";
import { maskCPF } from "@/lib/validations";

type Status = "pending" | "approved" | "rejected" | "all";

/** Lista de saques ou depósitos com decisão na própria linha. */
export function PaymentsPage({ type }: { type: "deposit" | "withdrawal" }) {
  const isWd = type === "withdrawal";
  const [status, setStatus] = useState<Status>(isWd ? "pending" : "all");
  const [page, setPage] = useState(0);
  const [rejecting, setRejecting] = useState<{ id: string; amount: number } | null>(null);
  const [approving, setApproving] = useState<{
    id: string;
    amount: number;
    pay: number;
    pix: string | null;
    name: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const qc = useQueryClient();
  const fetchList = useServerFn(listPayments);
  const decide = useServerFn(setTransactionStatus);
  const requestKyc = useServerFn(requestKycForTransaction);
  const recheck = useServerFn(recheckDeposit);

  const q = useQuery({
    queryKey: ["admin-payments", type, status, page],
    queryFn: () => fetchList({ data: { type, status, page } }),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  const done = () => {
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const decideM = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected"; reason?: string }) =>
      decide({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(
        v.status === "approved"
          ? isWd
            ? "Saque aprovado. Faça o Pix pelo gateway."
            : "Depósito aprovado e creditado."
          : "Recusado. O valor voltou para o saldo do jogador.",
      );
      setRejecting(null);
      setApproving(null);
      setReason("");
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const kycM = useMutation({
    mutationFn: (id: string) => requestKyc({ data: { transactionId: id } }),
    onSuccess: () => {
      toast.success("O jogador vai ver o pedido de documentos no saque.");
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const recheckM = useMutation({
    mutationFn: (id: string) => recheck({ data: { id } }),
    onSuccess: (r) => {
      toast(
        r.status === "approved"
          ? "Pagamento confirmado no gateway e creditado."
          : r.status === "rejected"
            ? "O gateway informa que não foi pago."
            : "Ainda pendente no gateway.",
      );
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title={isWd ? "Saques" : "Depósitos"}
        description={
          isWd
            ? "O valor de cada saque pendente já saiu do saldo do jogador. Aprovar confirma o pagamento; recusar devolve o valor ao saldo."
            : "Depósitos são confirmados pelo gateway. Se um Pix pago não entrou, use Reconsultar antes de aprovar na mão."
        }
        actions={
          <Segmented<Status>
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
            options={[
              { id: "pending", label: "Pendentes" },
              { id: "approved", label: "Aprovados" },
              { id: "rejected", label: "Recusados" },
              { id: "all", label: "Todos" },
            ]}
          />
        }
      />
      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Panel
          flush
          title={
            q.data
              ? `${q.data.total.toLocaleString("pt-BR")} ${isWd ? "saques" : "depósitos"}`
              : undefined
          }
        >
          <Table
            loading={q.isLoading}
            head={
              isWd
                ? [
                    "Pedido em",
                    "Jogador",
                    "Valor",
                    "Chave Pix",
                    "Histórico do jogador",
                    "Situação",
                    "",
                  ]
                : ["Criado em", "Jogador", "Valor", "Gateway", "Situação", ""]
            }
            empty={
              q.data && !q.data.rows.length ? (
                <Empty>{status === "pending" ? "Nada esperando decisão." : "Nada por aqui."}</Empty>
              ) : null
            }
          >
            {q.data?.rows.map((t) => (
              <tr key={t.id} className="align-top">
                <Td>
                  <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                    {formatDateTime(t.created_at)}
                  </span>
                </Td>
                <Td>
                  <PlayerLink user={t.user} id={t.user_id} />
                  {t.player?.frozen && <StatusPill status="frozen" />}
                </Td>
                <Td right>
                  <Money value={t.amount} className="font-display text-[18px] font-bold" />
                  {isWd && t.fee > 0 && (
                    <span className="num block whitespace-nowrap text-[12px] text-muted-foreground">
                      enviar {formatBRL(t.amount - t.fee)} (taxa {formatBRL(t.fee)})
                    </span>
                  )}
                </Td>
                {isWd ? (
                  <>
                    <Td>
                      <PixKey value={t.pix_key} />
                    </Td>
                    <Td>
                      {t.player && (
                        <span className="num block whitespace-nowrap text-[12.5px] leading-relaxed text-muted-foreground">
                          Depositou {formatBRL(t.player.deposits)}
                          <br />
                          Sacou {formatBRL(t.player.withdrawn)}
                          <br />
                          GGR {formatBRL(t.player.ggr)}
                        </span>
                      )}
                    </Td>
                  </>
                ) : (
                  <Td>
                    <span className="block max-w-[220px] truncate text-[13px] text-muted-foreground">
                      {t.description}
                    </span>
                  </Td>
                )}
                <Td>
                  <StatusPill status={t.status} />
                  {t.kyc_required && t.status === "pending" && (
                    <span className="mt-1 block text-[12px] text-gold">
                      {t.kycStatus === "pending"
                        ? "Documentos enviados"
                        : t.kycStatus === "rejected"
                          ? "Documentos recusados"
                          : "Esperando documentos"}
                    </span>
                  )}
                  {t.status === "rejected" && t.description?.includes(" — Motivo: ") && (
                    <span className="mt-1 block max-w-[200px] text-[12px] text-muted-foreground">
                      {t.description.split(" — Motivo: ")[1]}
                    </span>
                  )}
                </Td>
                <Td right>
                  {t.status === "pending" && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {isWd ? (
                        <>
                          <Button
                            size="sm"
                            className="shadow-none"
                            onClick={() =>
                              setApproving({
                                id: t.id,
                                amount: t.amount,
                                pay: t.amount - (t.fee ?? 0),
                                pix: t.pix_key,
                                name: t.user?.full_name || t.user?.username || "",
                              })
                            }
                            disabled={t.kyc_required}
                            title={
                              t.kyc_required ? "Aprove os documentos antes de pagar" : undefined
                            }
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shadow-none"
                            onClick={() => setRejecting({ id: t.id, amount: t.amount })}
                          >
                            Recusar
                          </Button>
                          {t.kyc_required ? (
                            <Link
                              to="/admin/kyc"
                              search={{}}
                              className="self-center text-[12.5px] font-semibold text-primary hover:underline"
                            >
                              Ver documentos
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={kycM.isPending}
                              onClick={() => kycM.mutate(t.id)}
                            >
                              Pedir documento
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shadow-none"
                            disabled={recheckM.isPending}
                            onClick={() => recheckM.mutate(t.id)}
                          >
                            Reconsultar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setApproving({
                                id: t.id,
                                amount: t.amount,
                                pay: t.amount,
                                pix: null,
                                name: t.user?.full_name || t.user?.username || "",
                              })
                            }
                          >
                            Aprovar na mão
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          {q.data && (
            <Pager page={page} pageSize={q.data.pageSize} total={q.data.total} onPage={setPage} />
          )}
        </Panel>
      )}

      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent className="rounded-[14px] border-border bg-background">
          <DialogTitle className="text-[24px]">
            {isWd ? "Aprovar saque" : "Aprovar depósito na mão"}
          </DialogTitle>
          <DialogDescription>
            {isWd
              ? `Envie ${formatBRL(approving?.pay)} por Pix para ${approving?.name}${approving?.pix ? ` (${approving.pix.replace(/^cpf:/, "chave CPF ")})` : ""} e depois confirme aqui. Os ${formatBRL(approving?.amount)} já saíram do saldo dele no pedido.`
              : `Isso credita ${formatBRL(approving?.amount)} no saldo de ${approving?.name} sem confirmação do gateway. Faça só se o dinheiro caiu na conta.`}
          </DialogDescription>
          <Button
            disabled={decideM.isPending}
            onClick={() => approving && decideM.mutate({ id: approving.id, status: "approved" })}
            className="h-11 rounded-[10px] font-bold shadow-none"
          >
            {decideM.isPending ? <Loader2 className="animate-spin" /> : "Aprovar"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="rounded-[14px] border-border bg-background">
          <DialogTitle className="text-[24px]">Recusar {isWd ? "saque" : "depósito"}</DialogTitle>
          <DialogDescription>
            {isWd
              ? `Os ${formatBRL(rejecting?.amount)} voltam para o saldo do jogador.`
              : "O depósito fica marcado como não concluído."}{" "}
            O jogador vê o motivo.
          </DialogDescription>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field-input h-auto py-2.5"
            placeholder="Ex.: dados bancários não conferem com o CPF da conta"
          />
          <Button
            disabled={reason.trim().length < 3 || decideM.isPending}
            onClick={() =>
              rejecting &&
              decideM.mutate({ id: rejecting.id, status: "rejected", reason: reason.trim() })
            }
            className="h-11 rounded-[10px] font-bold shadow-none"
          >
            {decideM.isPending ? <Loader2 className="animate-spin" /> : "Recusar"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Chave Pix do saque: mostra o CPF formatado e copia só os números. */
function PixKey({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">–</span>;
  const digits = value.replace(/^cpf:/, "");
  const label = value.startsWith("cpf:") ? `CPF ${maskCPF(digits)}` : value;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(digits).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="num inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] text-[13px] hover:text-primary"
      aria-label={`Copiar chave Pix ${label}`}
    >
      {label}
      {copied ? (
        <Check className="size-3.5 text-live" />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" />
      )}
    </button>
  );
}
