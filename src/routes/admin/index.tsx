import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardKPIs } from "@/lib/admin.functions";
import { ArrowDownCircle, ArrowUpCircle, Users, Wallet, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function Card({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase font-bold text-muted-foreground tracking-wide">{label}</span>
        <Icon className={`size-5 ${accent ?? "text-primary"}`} />
      </div>
      <div className="text-2xl md:text-3xl font-black">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const fn = useServerFn(getDashboardKPIs);
  const { data, isLoading } = useQuery({ queryKey: ["admin-kpi"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card icon={ArrowDownCircle} label="Depósitos hoje" value={brl(data.depositsToday)} sub={`${brl(data.depositsMonth)} no mês`} accent="text-success" />
        <Card icon={ArrowUpCircle} label="Saques hoje" value={brl(data.withdrawalsToday)} sub={`${brl(data.withdrawalsMonth)} no mês`} accent="text-destructive" />
        <Card icon={Users} label="Usuários" value={String(data.totalUsers)} />
        <Card icon={Wallet} label="Saldo em conta" value={brl(data.totalBalance)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={Clock} label="Depósitos pendentes" value={String(data.pendingDeposits)} accent="text-primary" />
        <Card icon={Clock} label="Saques pendentes" value={String(data.pendingWithdrawals)} accent="text-primary" />
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-bold mb-2">Boas-vindas ao painel</h2>
        <p className="text-sm text-muted-foreground">Use o menu lateral para aprovar depósitos/saques, gerenciar usuários e ajustar configurações da plataforma.</p>
      </div>
    </div>
  );
}
