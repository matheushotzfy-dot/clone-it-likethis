import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listTransactions, setTransactionStatus, deleteTransactionsBulkAdmin } from "@/lib/admin.functions";
import { requestKycForTransaction } from "@/lib/kyc.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Check, ShieldAlert, X, Trash2 } from "lucide-react";

type TxType = "all" | "deposit" | "withdrawal";

export function TransactionsTable({ title, type }: { title: string; type: TxType }) {
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fn = useServerFn(listTransactions);
  const setStatusFn = useServerFn(setTransactionStatus);
  const requestKycFn = useServerFn(requestKycForTransaction);
  const delBulkFn = useServerFn(deleteTransactionsBulkAdmin);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tx", type, status],
    queryFn: () => fn({ data: { type, status } }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const rows = (data ?? []) as any[];
  const allIds = useMemo(() => rows.map((t) => t.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggle = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

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

  const delMut = useMutation({
    mutationFn: (ids: string[]) => delBulkFn({ data: { ids } }),
    onSuccess: (r) => {
      toast.success(`${r.deleted} transação(ões) apagada(s)`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-kpi"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onBulkDelete = () => {
    if (!selected.size) return;
    if (!confirm(`Apagar ${selected.size} transação(ões)? Esta ação NÃO pode ser desfeita.`)) return;
    delMut.mutate([...selected]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-1 bg-muted rounded-md p-1 overflow-x-auto max-w-full">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded whitespace-nowrap ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="font-bold">{selected.size} selecionado(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Limpar</Button>
            <Button size="sm" variant="destructive" disabled={delMut.isPending} onClick={onBulkDelete}>
              <Trash2 className="size-4 mr-1" /> Apagar
            </Button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" /></th>
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
            {isLoading && <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma transação</td></tr>}
            {rows.map((t: any) => (
              <tr key={t.id} className={`border-t border-border hover:bg-muted/30 ${selected.has(t.id) ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-3"><Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label="Selecionar" /></td>
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.length > 0 && (
          <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            Selecionar todos ({rows.length})
          </label>
        )}
        {isLoading && <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>}
        {!isLoading && rows.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma transação</div>}
        {rows.map((t: any) => (
          <div key={t.id} className={`rounded-xl border bg-card p-3 space-y-2 ${selected.has(t.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
            <div className="flex items-start gap-3">
              <Checkbox className="mt-1" checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Link to="/admin/usuarios/$id" params={{ id: t.user_id }} className="font-bold truncate hover:text-primary">
                    {t.user?.full_name || t.user?.username || t.user_id.slice(0, 8)}
                  </Link>
                  <StatusBadge s={t.status} />
                </div>
                <div className="text-xs text-muted-foreground truncate">{t.user?.email || "—"}</div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground">{t.type}</span>
                  <span className="font-bold text-primary">R$ {Number(t.amount).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
                {t.pix_key && type !== "deposit" && <div className="text-[11px] font-mono text-muted-foreground truncate">PIX: {t.pix_key}</div>}
              </div>
            </div>
            {t.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                {t.type === "withdrawal" && !t.kyc_required && (
                  <Button size="sm" variant="outline" className="flex-1" disabled={kycMut.isPending} onClick={() => kycMut.mutate(t.id)}>
                    <ShieldAlert className="size-4 mr-1" /> KYC
                  </Button>
                )}
                <Button size="sm" className="flex-1 bg-success text-white hover:bg-success/90" onClick={() => mut.mutate({ id: t.id, s: "approved" })}>
                  <Check className="size-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => mut.mutate({ id: t.id, s: "rejected" })}>
                  <X className="size-4 mr-1" /> Rejeitar
                </Button>
              </div>
            )}
          </div>
        ))}
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
