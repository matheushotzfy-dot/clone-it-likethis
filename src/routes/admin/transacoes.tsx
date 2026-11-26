import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getReconciliation, listLedgerAll } from "@/lib/admin.functions";
import {
  Empty,
  ErrorBox,
  LoadMore,
  Money,
  PageHeader,
  Panel,
  PlayerLink,
  Segmented,
  Table,
  Td,
} from "@/components/admin/ui";
import { formatBRL, formatDateTime } from "@/lib/format";

type Kind = "all" | "money" | "casino" | "sports" | "adjustment";

export const Route = createFileRoute("/admin/transacoes")({
  head: () => ({ meta: [{ title: "Movimentações | admin" }] }),
  component: Page,
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

function Page() {
  const [kind, setKind] = useState<Kind>("all");
  const fetchLedger = useServerFn(listLedgerAll);
  const fetchRecon = useServerFn(getReconciliation);
  const recon = useQuery({ queryKey: ["admin-recon"], queryFn: () => fetchRecon() });
  const q = useInfiniteQuery({
    queryKey: ["admin-ledger", kind],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchLedger({ data: { before: pageParam, kind } }),
    getNextPageParam: (last) => (last.length === 60 ? last[last.length - 1].id : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  const r = recon.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Movimentações"
        description="Cada centavo que entrou ou saiu de qualquer saldo, na ordem em que aconteceu. Nada aqui pode ser editado ou apagado."
      />

      <Panel title="Reconciliação">
        {!r ? (
          <div className="skeleton h-12 rounded-[8px]" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              {r.issues.length === 0 ? (
                <CheckCircle2 className="size-5 text-live" />
              ) : (
                <AlertTriangle className="size-5 text-destructive" />
              )}
              {r.issues.length === 0
                ? "Todos os saldos batem com o extrato"
                : `${r.issues.length} conta(s) com saldo diferente do extrato`}
            </p>
            <p className="num text-[14px] text-muted-foreground">
              Soma dos saldos {formatBRL(r.sumBalance)}
            </p>
            <p className="num text-[14px] text-muted-foreground">
              Soma do extrato {formatBRL(r.sumLedger)}
            </p>
            <p className="num text-[14px] text-muted-foreground">{r.players} contas</p>
          </div>
        )}
        {r && r.issues.length > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-[10px] border border-destructive/40">
            {r.issues.map((i) => (
              <li
                key={i.user_id}
                className="flex items-center justify-between px-4 py-2.5 text-[14px]"
              >
                <PlayerLink user={{ username: i.username ?? "" }} id={i.user_id!} />
                <span className="num">
                  saldo {formatBRL(Number(i.balance))}, extrato {formatBRL(Number(i.ledger_total))},
                  diferença{" "}
                  <strong className="text-destructive">{formatBRL(Number(i.diff))}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Segmented<Kind>
        value={kind}
        onChange={setKind}
        options={[
          { id: "all", label: "Tudo" },
          { id: "money", label: "Depósitos e saques" },
          { id: "casino", label: "Cassino" },
          { id: "sports", label: "Esportes" },
          { id: "adjustment", label: "Ajustes manuais" },
        ]}
      />

      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Panel flush>
          <Table
            loading={q.isLoading}
            head={["Quando", "Jogador", "Movimentação", "Detalhe", "Valor", "Saldo depois"]}
            empty={!q.isLoading && !rows.length ? <Empty>Nenhuma movimentação.</Empty> : null}
          >
            {rows.map((m) => (
              <tr key={m.id}>
                <Td>
                  <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                    {formatDateTime(m.created_at)}
                  </span>
                </Td>
                <Td>
                  <PlayerLink user={m.user} id={m.user_id} />
                </Td>
                <Td>
                  <span className="font-medium">{KIND[m.kind] ?? m.kind}</span>
                </Td>
                <Td>
                  <span className="block max-w-[300px] truncate text-[13px] text-muted-foreground">
                    {m.description}
                    {m.createdByName ? ` (por ${m.createdByName})` : ""}
                  </span>
                </Td>
                <Td right>
                  <Money value={m.amount} signed className="font-semibold" />
                </Td>
                <Td right>
                  <Money value={m.balance_after} />
                </Td>
              </tr>
            ))}
          </Table>
          <LoadMore
            show={!!q.hasNextPage}
            loading={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          />
        </Panel>
      )}
    </div>
  );
}
