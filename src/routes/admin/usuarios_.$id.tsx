import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserDetail, adjustBalance, updateUserAdmin, deleteUserAdmin, setTransactionStatus, freezeForExploit } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, ShieldAlert, ShieldCheck, Snowflake, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/usuarios_/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fn = useServerFn(getUserDetail);
  const adjust = useServerFn(adjustBalance);
  const updFn = useServerFn(updateUserAdmin);
  const delFn = useServerFn(deleteUserAdmin);
  const txStatusFn = useServerFn(setTransactionStatus);
  const exploitFn = useServerFn(freezeForExploit);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-user", id], queryFn: () => fn({ data: { id } }), staleTime: 10_000, refetchOnWindowFocus: false });

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (data?.profile) setForm({
      full_name: data.profile.full_name ?? "",
      username: data.profile.username ?? "",
      cpf: data.profile.cpf ?? "",
      phone: data.profile.phone ?? "",
      kyc_status: data.profile.kyc_status ?? "pending",
      is_frozen: !!data.profile.is_frozen,
      freeze_reason: data.profile.freeze_reason ?? "",
    });
  }, [data?.profile]);

  const adjustMut = useMutation({
    mutationFn: () => adjust({ data: { userId: id, delta: Number(delta), reason } }),
    onSuccess: () => { toast.success("Saldo ajustado"); setDelta(""); setReason(""); qc.invalidateQueries({ queryKey: ["admin-user", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: () => updFn({ data: { userId: id, ...form } }),
    onSuccess: () => { toast.success("Dados atualizados"); qc.invalidateQueries({ queryKey: ["admin-user", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const freezeMut = useMutation({
    mutationFn: (vars: { v: boolean; reason?: string }) => updFn({ data: { userId: id, is_frozen: vars.v, freeze_reason: vars.v ? (vars.reason ?? null) : null } }),
    onSuccess: (_d, vars) => { toast.success(vars.v ? "Conta congelada" : "Conta descongelada"); qc.invalidateQueries({ queryKey: ["admin-user", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => delFn({ data: { userId: id } }),
    onSuccess: () => { toast.success("Usuário apagado"); navigate({ to: "/admin/usuarios" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const txMut = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected"; reason?: string }) => txStatusFn({ data: vars }),
    onSuccess: () => { toast.success("Transação atualizada"); qc.invalidateQueries({ queryKey: ["admin-user", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data || !form) return <div className="space-y-4">{[96, 280, 220].map((h) => <div key={h} style={{ height: h }} className="animate-pulse rounded-xl border border-border bg-card" />)}</div>;
  if (error) return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">Erro ao abrir detalhes: {(error as Error).message}<button onClick={() => refetch()} className="ml-2 font-bold underline">tentar novamente</button></div>;
  const p = data.profile;
  if (!p) return <div>Usuário não encontrado. <Link to="/admin/usuarios" className="text-primary">Voltar</Link></div>;

  const txs: any[] = data.transactions ?? [];
  const sumBy = (fn: (t: any) => boolean) => txs.filter(fn).reduce((a, t) => a + Number(t.amount), 0);
  const countBy = (fn: (t: any) => boolean) => txs.filter(fn).length;
  const totalDeposited = sumBy(t => t.type === "deposit" && t.status === "approved");
  const totalWithdrawn = sumBy(t => t.type === "withdrawal" && t.status === "approved");
  const pendingWithdrawals = sumBy(t => t.type === "withdrawal" && t.status === "pending");
  const pendingDeposits = sumBy(t => t.type === "deposit" && t.status === "pending");
  const rejectedWithdrawals = sumBy(t => t.type === "withdrawal" && t.status === "rejected");
  const totalBonus = sumBy(t => t.type === "bonus" && t.status === "approved");
  const depositCount = countBy(t => t.type === "deposit" && t.status === "approved");
  const withdrawCount = countBy(t => t.type === "withdrawal" && t.status === "approved");
  const lastDeposit = txs.find(t => t.type === "deposit" && t.status === "approved");
  const lastWithdraw = txs.find(t => t.type === "withdrawal" && t.status === "approved");
  const fmt = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");
  const net = totalDeposited - totalWithdrawn;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/admin/usuarios" className="text-sm text-primary">← Voltar</Link>
        <div className="flex gap-2">
          <Button variant={form.is_frozen ? "default" : "outline"} onClick={() => {
            if (form.is_frozen) {
              freezeMut.mutate({ v: false });
            } else {
              const reason = window.prompt("Motivo do congelamento (será exibido para o usuário):", "");
              if (reason === null) return;
              const trimmed = reason.trim();
              if (!trimmed) { toast.error("Informe um motivo"); return; }
              freezeMut.mutate({ v: true, reason: trimmed });
            }
          }}>
            <Snowflake className="size-4 mr-2" />
            {form.is_frozen ? "Descongelar" : "Congelar conta"}
          </Button>
          <Button variant="destructive" onClick={() => { if (confirm("Apagar definitivamente este usuário e todos os dados? Esta ação NÃO pode ser desfeita.")) delMut.mutate(); }}>
            <Trash2 className="size-4 mr-2" /> Apagar usuário
          </Button>
        </div>
      </div>

      {p.is_frozen && (
        <div className="bg-destructive/10 border border-destructive/40 text-destructive rounded-lg px-4 py-3 text-sm">
          <div className="font-bold">⚠️ Conta congelada — usuário não consegue depositar nem sacar</div>
          {p.freeze_reason && <div className="mt-1 text-xs opacity-90">Motivo: {p.freeze_reason}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">Dados do usuário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Field label="Email (somente leitura)"><Input value={p.email || "—"} readOnly className="bg-muted/30" /></Field>
            <Field label="Nome completo"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="CPF"><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="KYC">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.kyc_status} onChange={(e) => setForm({ ...form, kyc_status: e.target.value })}>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
              </select>
            </Field>
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-bold uppercase tracking-wider mt-3">Tracking / origem</summary>
            <dl className="grid grid-cols-2 gap-2 mt-3">
              <div><dt>UTM Source</dt><dd>{p.utm_source ?? "—"}</dd></div>
              <div><dt>UTM Medium</dt><dd>{p.utm_medium ?? "—"}</dd></div>
              <div><dt>UTM Campaign</dt><dd>{p.utm_campaign ?? "—"}</dd></div>
              <div><dt>UTM Content</dt><dd>{p.utm_content ?? "—"}</dd></div>
              <div><dt>Referrer</dt><dd className="break-all">{p.referrer ?? "—"}</dd></div>
              <div><dt>IP</dt><dd className="font-mono">{p.signup_ip ?? "—"}</dd></div>
              <div className="col-span-2"><dt>User Agent</dt><dd className="break-all">{p.signup_user_agent ?? "—"}</dd></div>
              <div><dt>fbp</dt><dd className="font-mono break-all">{p.fbp ?? "—"}</dd></div>
              <div><dt>fbc</dt><dd className="font-mono break-all">{p.fbc ?? "—"}</dd></div>
              <div><dt>Cadastro</dt><dd>{new Date(p.created_at).toLocaleString("pt-BR")}</dd></div>
            </dl>
          </details>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div>
            <div className="text-xs uppercase font-bold text-muted-foreground">Saldo atual</div>
            <div className="text-3xl font-black text-primary">R$ {Number(p.balance).toFixed(2).replace(".", ",")}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            Bônus: R$ {Number(p.bonus_balance).toFixed(2).replace(".", ",")} · {p.bonus_used ? "usado" : "disponível"}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs uppercase font-bold text-muted-foreground">Ajustar saldo</div>
            <Input placeholder="Valor (use - para debitar)" value={delta} onChange={(e) => setDelta(e.target.value)} />
            <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button className="w-full" disabled={!delta || !reason || adjustMut.isPending} onClick={() => adjustMut.mutate()}>
              {adjustMut.isPending ? "Aplicando..." : "Aplicar ajuste"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Histórico KYC</h3>
          <Link to="/admin/kyc" className="text-sm font-bold text-primary hover:underline">Abrir fila KYC</Link>
        </div>
        {(data.kyc ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento enviado por este usuário.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {(data.kyc ?? []).map((k: any) => (
              <div key={k.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="font-bold"><FileText className="inline size-4 mr-1 text-primary" /> {k.document_type?.toUpperCase()}</span><StatusBadge s={k.status} /></div>
                <p className="mt-1 text-xs text-muted-foreground">Enviado em {new Date(k.created_at).toLocaleString("pt-BR")}</p>
                {k.rejection_reason && <p className="mt-2 text-xs text-destructive">{k.rejection_reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total depositado" value={fmt(totalDeposited)} sub={`${depositCount} depósitos`} tone="green" />
        <StatCard label="Total sacado" value={fmt(totalWithdrawn)} sub={`${withdrawCount} saques`} tone="red" />
        <StatCard label="Saldo líquido (dep - saq)" value={fmt(net)} sub={net >= 0 ? "GGR positivo" : "GGR negativo"} tone={net >= 0 ? "green" : "red"} />
        <StatCard label="Bônus recebido" value={fmt(totalBonus)} sub={p.bonus_used ? "bônus usado" : "disponível"} tone="primary" />
        <StatCard label="Saques pendentes" value={fmt(pendingWithdrawals)} sub={`${countBy(t => t.type === "withdrawal" && t.status === "pending")} pendentes`} tone="yellow" />
        <StatCard label="Depósitos pendentes" value={fmt(pendingDeposits)} sub={`${countBy(t => t.type === "deposit" && t.status === "pending")} aguardando`} tone="yellow" />
        <StatCard label="Saques recusados" value={fmt(rejectedWithdrawals)} sub={`${countBy(t => t.type === "withdrawal" && t.status === "rejected")} rejeitados`} tone="muted" />
        <StatCard label="Última atividade" value={lastDeposit || lastWithdraw ? new Date((lastDeposit ?? lastWithdraw).created_at).toLocaleDateString("pt-BR") : "—"} sub={lastDeposit ? `Últ. depósito ${fmt(Number(lastDeposit.amount))}` : "sem depósitos"} tone="muted" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <h3 className="font-bold p-4">Transações ({txs.length})</h3>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Valor</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2 text-right">Ações</th></tr>
          </thead>
          <tbody>
            {data.transactions.length === 0 && (<tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Sem transações</td></tr>)}
            {data.transactions.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2 capitalize">{t.type}</td>
                <td className="px-4 py-2 font-bold">R$ {Number(t.amount).toFixed(2).replace(".", ",")}</td>
                <td className="px-4 py-2"><StatusBadge s={t.status} /></td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{t.description}</td>
                <td className="px-4 py-2 text-right">
                  {t.status === "pending" && (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" onClick={() => txMut.mutate({ id: t.id, status: "approved" })}>Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        const reason = window.prompt("Motivo da rejeição (será exibido para o usuário):", "");
                        if (reason === null) return;
                        const trimmed = reason.trim();
                        if (!trimmed) { toast.error("Informe um motivo"); return; }
                        txMut.mutate({ id: t.id, status: "rejected", reason: trimmed });
                      }}>Rejeitar</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase font-bold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "red" | "yellow" | "primary" | "muted" }) {
  const toneMap: Record<string, string> = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    primary: "text-primary",
    muted: "text-foreground",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</div>
      <div className={`text-lg font-black mt-1 ${toneMap[tone ?? "muted"]}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${map[s] ?? "bg-muted"}`}>{s}</span>;
}
