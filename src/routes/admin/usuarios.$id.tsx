import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserDetail, adjustBalance } from "@/lib/admin.functions";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const fn = useServerFn(getUserDetail);
  const adjust = useServerFn(adjustBalance);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-user", id], queryFn: () => fn({ data: { id } }) });
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => adjust({ data: { userId: id, delta: Number(delta), reason } }),
    onSuccess: () => { toast.success("Saldo ajustado"); setDelta(""); setReason(""); qc.invalidateQueries({ queryKey: ["admin-user", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) return <div>Carregando...</div>;
  const p = data.profile;
  if (!p) return <div>Usuário não encontrado. <Link to="/admin/usuarios" className="text-primary">Voltar</Link></div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/usuarios" className="text-sm text-primary">← Voltar</Link>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 md:col-span-2">
          <h2 className="text-xl font-bold mb-3">{p.full_name || p.username || "Sem nome"}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Email</dt><dd className="font-mono text-xs break-all">{p.email || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Usuário</dt><dd className="font-mono">{p.username ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">CPF</dt><dd className="font-mono">{p.cpf ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Telefone</dt><dd className="font-mono">{p.phone ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">KYC</dt><dd className="uppercase font-bold">{p.kyc_status}</dd></div>
            <div><dt className="text-muted-foreground">Cadastro</dt><dd>{new Date(p.created_at).toLocaleString("pt-BR")}</dd></div>
            <div><dt className="text-muted-foreground">Saldo bônus</dt><dd>R$ {Number(p.bonus_balance).toFixed(2).replace(".", ",")}</dd></div>
            <div><dt className="text-muted-foreground">Bônus usado?</dt><dd>{p.bonus_used ? "Sim" : "Não"}</dd></div>
            <div className="col-span-2 border-t border-border pt-3 mt-1"><dt className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Origem / Tracking</dt></div>
            <div><dt className="text-muted-foreground">UTM Source</dt><dd>{p.utm_source ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">UTM Medium</dt><dd>{p.utm_medium ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">UTM Campaign</dt><dd>{p.utm_campaign ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">UTM Content</dt><dd>{p.utm_content ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Referrer</dt><dd className="text-xs break-all">{p.referrer ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">IP</dt><dd className="font-mono text-xs">{p.signup_ip ?? "—"}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">User Agent</dt><dd className="text-xs break-all">{p.signup_user_agent ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">fbp</dt><dd className="font-mono text-[10px] break-all">{p.fbp ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">fbc</dt><dd className="font-mono text-[10px] break-all">{p.fbc ?? "—"}</dd></div>
          </dl>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase font-bold text-muted-foreground">Saldo atual</div>
          <div className="text-3xl font-black text-primary">R$ {Number(p.balance).toFixed(2).replace(".", ",")}</div>
          <div className="mt-4 space-y-2">
            <Input placeholder="Valor (use - para debitar)" value={delta} onChange={(e) => setDelta(e.target.value)} />
            <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button className="w-full" disabled={!delta || !reason || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Aplicando..." : "Ajustar saldo"}
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <h3 className="font-bold p-4">Transações</h3>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Valor</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Descrição</th></tr>
          </thead>
          <tbody>
            {data.transactions.length === 0 && (<tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Sem transações</td></tr>)}
            {data.transactions.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2 capitalize">{t.type}</td>
                <td className="px-4 py-2 font-bold">R$ {Number(t.amount).toFixed(2).replace(".", ",")}</td>
                <td className="px-4 py-2"><StatusBadge s={t.status} /></td>
                <td className="px-4 py-2 text-muted-foreground">{t.description}</td>
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
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${map[s] ?? "bg-muted"}`}>{s}</span>;
}
