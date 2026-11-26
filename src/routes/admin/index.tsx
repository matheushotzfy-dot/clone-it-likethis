import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getOverview } from "@/lib/admin.functions";
import { ErrorBox, Money, PageHeader, Panel, Segmented, Stat } from "@/components/admin/ui";
import { FlowChart, GgrChart } from "@/components/admin/flow-chart";
import { formatBRL, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Visão geral | admin" }] }),
  component: Dashboard,
});

const KIND: Record<string, string> = {
  opening: "Saldo inicial",
  deposit: "Depósito",
  withdrawal_hold: "Saque pedido",
  withdrawal_release: "Saque devolvido",
  casino_bet: "Aposta cassino",
  casino_win: "Ganho cassino",
  casino_refund: "Estorno cassino",
  sports_stake: "Aposta esportiva",
  sports_payout: "Prêmio esportivo",
  sports_refund: "Aposta anulada",
  adjustment: "Ajuste manual",
};

function Dashboard() {
  const [days, setDays] = useState<"1" | "7" | "14" | "30">("14");
  const fetchOverview = useServerFn(getOverview);
  const q = useQuery({
    queryKey: ["admin-overview", Number(days)],
    queryFn: () => fetchOverview({ data: { days: Number(days) } }),
    refetchInterval: 30_000,
  });

  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Dinheiro que entrou e saiu, resultado da casa e o que está esperando decisão."
        actions={
          <Segmented
            value={days}
            onChange={setDays}
            options={[
              { id: "1", label: "Hoje" },
              { id: "7", label: "7 dias" },
              { id: "14", label: "14 dias" },
              { id: "30", label: "30 dias" },
            ]}
          />
        }
      />

      {!d ? (
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-[104px] rounded-[12px]" />
          ))}
        </div>
      ) : (
        <>
          {(d.queues.withdrawals > 0 ||
            d.queues.kyc > 0 ||
            d.reconciliationIssues > 0 ||
            d.pfProblems24h > 0) && (
            <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
              {d.queues.withdrawals > 0 && (
                <Stat
                  to="/admin/saques"
                  tone="warn"
                  value={d.queues.withdrawals}
                  label="Saques esperando decisão"
                  sub={formatBRL(d.queues.withdrawalsAmount)}
                />
              )}
              {d.queues.kyc > 0 && (
                <Stat
                  to="/admin/kyc"
                  tone="warn"
                  value={d.queues.kyc}
                  label="Documentos para analisar"
                />
              )}
              {d.reconciliationIssues > 0 && (
                <Stat
                  to="/admin/transacoes"
                  tone="out"
                  value={d.reconciliationIssues}
                  label="Saldos fora do extrato"
                  sub="Abra Movimentações > Reconciliação"
                />
              )}
              {d.pfProblems24h > 0 && (
                <Stat
                  to="/admin/cassino"
                  tone="warn"
                  value={d.pfProblems24h}
                  label="Avisos da PlayFivers em 24h"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat
              tone="in"
              value={formatBRL(d.period.deposits)}
              label="Depósitos"
              sub={`${d.days.reduce((a, x) => a + x.depositsCount, 0)} Pix confirmados`}
            />
            <Stat
              tone="out"
              value={formatBRL(d.period.withdrawals)}
              label="Saques pagos"
              sub={`${d.days.reduce((a, x) => a + x.withdrawalsCount, 0)} saques`}
            />
            <Stat
              value={formatBRL(d.period.deposits - d.period.withdrawals)}
              label="Caixa líquido"
              sub="Depósitos menos saques pagos"
            />
            <Stat
              value={formatBRL(d.period.ggr)}
              label="GGR"
              sub="Apostado menos pago em prêmios"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat
              value={formatBRL(d.liability)}
              label="Saldo dos jogadores"
              sub={`${d.playersWithBalance} contas com saldo`}
            />
            <Stat
              value={d.playingNow}
              label="Jogando agora"
              sub="Abriram um jogo nos últimos 15 min"
            />
            <Stat
              value={d.period.signups}
              label="Cadastros"
              sub={`${d.today?.signups ?? 0} hoje`}
            />
            <Stat
              to="/admin/esportes"
              value={formatBRL(d.openBets.maxPayout)}
              label="Exposição em esportes"
              sub={`${d.openBets.count} apostas abertas`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Panel title="Entradas e saídas por dia">
              <FlowChart
                data={d.days.map((x) => ({
                  day: x.day,
                  deposits: x.deposits,
                  withdrawals: x.withdrawals,
                }))}
              />
            </Panel>
            <Panel title="GGR por dia">
              <GgrChart data={d.days.map((x) => ({ day: x.day, ggr: x.ggr }))} />
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[13.5px]">
                <div>
                  <dt className="text-muted-foreground">Apostado no cassino</dt>
                  <dd className="num font-semibold">{formatBRL(d.period.casinoBets)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Apostado em esportes</dt>
                  <dd className="num font-semibold">{formatBRL(d.period.sportsStakes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ajustes manuais</dt>
                  <dd className="num font-semibold">
                    <Money value={d.period.adjustments} signed />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Jogadores ativos hoje</dt>
                  <dd className="num font-semibold">{d.today?.active ?? 0}</dd>
                </div>
              </dl>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Panel
              title="Últimas movimentações"
              actions={
                <Link
                  to="/admin/transacoes"
                  className="text-[13px] font-semibold text-primary hover:underline"
                >
                  Ver todas
                </Link>
              }
              flush
            >
              {d.recent.length === 0 ? (
                <p className="px-5 py-10 text-center text-[14px] text-muted-foreground">
                  Nenhuma movimentação ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.recent.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/admin/usuarios/$id"
                          params={{ id: r.user_id }}
                          className="block truncate text-[14px] font-semibold hover:text-primary"
                        >
                          {r.user?.full_name || r.user?.username || r.user_id.slice(0, 8)}
                        </Link>
                        <p className="text-[12.5px] text-muted-foreground">
                          {KIND[r.kind] ?? r.kind}, {formatWhen(r.created_at)}
                        </p>
                      </div>
                      <Money value={r.amount} signed className="font-semibold" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Saúde da plataforma">
              <ul className="space-y-3 text-[14px]">
                <Health
                  ok={d.reconciliationIssues === 0}
                  good="Todos os saldos batem com o extrato"
                  bad={`${d.reconciliationIssues} saldo(s) fora do extrato`}
                />
                <Health
                  ok={d.pfProblems24h === 0}
                  good="Nenhum aviso da PlayFivers em 24h"
                  bad={`${d.pfProblems24h} aviso(s) da PlayFivers em 24h`}
                />
                <Health
                  ok={d.flags.realMoney}
                  good="Dinheiro real ligado"
                  bad="Homologação: dinheiro real desligado"
                  neutral
                />
                <Health
                  ok={!d.flags.maintenance}
                  good="Site fora de manutenção"
                  bad="Site em manutenção"
                />
                <Health ok={d.flags.casino} good="Cassino aberto" bad="Cassino fechado" neutral />
                <Health
                  ok={d.flags.sports}
                  good="Esportes abertos"
                  bad="Esportes fechados"
                  neutral
                />
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Health({
  ok,
  good,
  bad,
  neutral,
}: {
  ok: boolean;
  good: string;
  bad: string;
  neutral?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      {ok ? (
        <CheckCircle2 className="size-[18px] shrink-0 text-live" />
      ) : (
        <AlertTriangle
          className={cn("size-[18px] shrink-0", neutral ? "text-gold" : "text-destructive")}
        />
      )}
      <span className={cn(!ok && !neutral && "font-semibold")}>{ok ? good : bad}</span>
    </li>
  );
}
