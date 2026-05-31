import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardKPIs } from "@/lib/admin.functions";
import { ArrowDownCircle, ArrowUpCircle, Users, Wallet, Clock, ShieldCheck, Activity, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function Card({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/90 p-5 shadow-lg shadow-background/20">
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
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-kpi"], queryFn: () => fn(), staleTime: 15_000, refetchOnWindowFocus: false });

  if (isLoading || !data) return <DashboardSkeleton />;
  if (error) return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive"><b>Erro ao carregar painel.</b><p className="mt-1">{(error as Error).message}</p><button onClick={() => refetch()} className="mt-3 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">Tentar novamente</button></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-surface p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary"><Activity className="size-4" /> Operação em tempo real</div>
            <h1 className="text-2xl md:text-4xl font-black">Painel administrativo</h1>
            <p className="mt-2 text-sm text-muted-foreground">Resumo financeiro, filas pendentes e verificação dos usuários em um só lugar.</p>
          </div>
          <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm">
            <div className="text-xs font-bold uppercase text-muted-foreground">Resultado 7 dias</div>
            <div className="text-2xl font-black text-primary">{brl(data.weeklyNet)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Card icon={ArrowDownCircle} label="Depósitos hoje" value={brl(data.depositsToday)} sub={`${brl(data.depositsMonth)} no mês`} accent="text-success" />
        <Card icon={ArrowUpCircle} label="Saques hoje" value={brl(data.withdrawalsToday)} sub={`${brl(data.withdrawalsMonth)} no mês`} accent="text-destructive" />
        <Card icon={Users} label="Usuários" value={String(data.totalUsers)} />
        <Card icon={Wallet} label="Saldo em conta" value={brl(data.totalBalance)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Fluxo dos últimos 7 dias</h2>
              <p className="text-xs text-muted-foreground">Depósitos e saques aprovados</p>
            </div>
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.55)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.55)" tickLine={false} axisLine={false} fontSize={12} width={54} tickFormatter={(v) => `R$${Number(v)}`} />
                <Tooltip formatter={(v: number) => brl(Number(v))} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="deposits" name="Depósitos" stroke="var(--success)" fill="var(--success)" fillOpacity={0.22} strokeWidth={2} />
                <Area type="monotone" dataKey="withdrawals" name="Saques" stroke="var(--destructive)" fill="var(--destructive)" fillOpacity={0.18} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-4">
        <Card icon={Clock} label="Depósitos pendentes" value={String(data.pendingDeposits)} accent="text-primary" />
        <Card icon={Clock} label="Saques pendentes" value={String(data.pendingWithdrawals)} accent="text-primary" />
          <Card icon={ShieldCheck} label="KYC pendente" value={String(data.kycPending)} sub={`${data.kycRequested} saques aguardando verificação`} accent="text-primary" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="space-y-4">{[96, 132, 320].map((h) => <div key={h} style={{ height: h }} className="animate-pulse rounded-xl border border-border bg-card/70" />)}</div>;
}
