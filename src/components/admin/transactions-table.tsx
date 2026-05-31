import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listTransactions, setTransactionStatus } from "@/lib/admin.functions";
import { requestKycForTransaction } from "@/lib/kyc.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, ShieldAlert, X } from "lucide-react";

type TxType = "all" | "deposit" | "withdrawal";

export function TransactionsTable({ title, type }: { title: string; type: TxType }) {
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const fn = useServerFn(listTransactions);
  const setStatusFn = useServerFn(setTransactionStatus);
  const requestKycFn = useServerFn(requestKycForTransaction);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tx", type, status],
    queryFn: () => fn({ data: { type, status } }),
  });

  const mut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: "approved" | "rejected" }) => setStatusFn({ data: { id, status: s } }),
    onSuccess: (_, v) => {
      toast.success(v.s === "approved" ? "Aprovado" : "Rejeitado");
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-kpi"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const kycMut = useMutation({
    mutationFn: (id: string) => requestKycFn({ data: { transactionId: id } }),
    onSuccess: () => { toast.success("KYC solicitado para este saque"); qc.invalidateQueries({ queryKey: ["admin-tx"] }); qc.invalidateQueries({ queryKey: ["admin-kpi"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-1 bg-muted rounded-md p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">CPF</th>
              {type === "all" && <th className="px-4 py-3">Tipo</th>}
              <th className="px-4 py-3">Valor</th>
              {type !== "deposit" && <th className="px-4 py-3">Chave PIX</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && (data ?? []).length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma transação</td></tr>}
            {(data ?? []).map((t: any) => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3"><Link to="/admin/usuarios/$id" params={{ id: t.user_id }} className="font-bold hover:text-primary">{t.user?.full_name || t.user?.username || t.user_id.slice(0, 8)}</Link></td>
                <td className="px-4 py-3 text-xs">{t.user?.email || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.user?.cpf || "—"}</td>
                {type === "all" && <td className="px-4 py-3 capitalize">{t.type}</td>}
                <td className="px-4 py-3 font-bold">R$ {Number(t.amount).toFixed(2).replace(".", ",")}</td>
                {type !== "deposit" && <td className="px-4 py-3 font-mono text-xs">{t.pix_key ?? "—"}</td>}
                <td className="px-4 py-3"><div className="flex flex-col gap-1"><StatusBadge s={t.status} />{t.kyc_required && <span className="w-fit rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-orange-400">KYC solicitado</span>}</div></td>
                <td className="px-4 py-3">
                  {t.status === "pending" ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {t.type === "withdrawal" && !t.kyc_required && (
                        <Button size="sm" variant="outline" disabled={kycMut.isPending} onClick={() => kycMut.mutate(t.id)}>
                          <ShieldAlert className="size-4" /> Solicitar KYC
                        </Button>
                      )}
                      <Button size="sm" variant="default" className="bg-success text-white hover:bg-success/90" onClick={() => mut.mutate({ id: t.id, s: "approved" })}>
                        <Check className="size-4" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => mut.mutate({ id: t.id, s: "rejected" })}>
                        <X className="size-4" /> Rejeitar
                      </Button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground text-right block">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500",
    completed: "bg-green-500/20 text-green-500",
    failed: "bg-red-500/20 text-red-500",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${map[s] ?? "bg-muted"}`}>{s}</span>;
}
