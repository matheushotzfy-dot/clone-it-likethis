import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGameStats, listPfLog, listRounds } from "@/lib/admin.functions";
import {
  Empty,
  ErrorBox,
  LoadMore,
  Money,
  PageHeader,
  Panel,
  PlayerLink,
  Segmented,
  StatusPill,
  Table,
  Td,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";

type View = "rodadas" | "grandes" | "jogos" | "avisos";

export const Route = createFileRoute("/admin/cassino")({
  head: () => ({ meta: [{ title: "Cassino | admin" }] }),
  component: Page,
});

const RESULT: Record<string, string> = {
  ok: "ok",
  duplicate: "repetido",
  insufficient: "saldo insuficiente",
  frozen: "conta suspensa",
  self_excluded: "autoexclusão",
  loss_limit: "limite de perda",
  unauthorized: "credencial inválida",
  invalid_round: "rodada inválida",
  user_not_found: "jogador não existe",
  not_found: "estorno sem rodada original",
  already_refunded: "já estornada",
  refunded: "estornada",
  bad_json: "corpo inválido",
  unexpected_type: "tipo desconhecido",
  error: "erro interno",
};

function Page() {
  const [view, setView] = useState<View>("rodadas");
  return (
    <div className="space-y-5">
      <PageHeader
        title="Cassino"
        description="Toda rodada que a PlayFivers mandou, o que cada jogo rendeu e os avisos fora do normal."
      />
      <Segmented<View>
        value={view}
        onChange={setView}
        options={[
          { id: "rodadas", label: "Rodadas ao vivo" },
          { id: "grandes", label: "Ganhos acima de R$ 500" },
          { id: "jogos", label: "Por jogo" },
          { id: "avisos", label: "Avisos da integração" },
        ]}
      />
      {(view === "rodadas" || view === "grandes") && <Rounds bigWins={view === "grandes"} />}
      {view === "jogos" && <Games />}
      {view === "avisos" && <PfLog />}
    </div>
  );
}

function Rounds({ bigWins }: { bigWins: boolean }) {
  const fetchRounds = useServerFn(listRounds);
  const q = useInfiniteQuery({
    queryKey: ["admin-rounds", bigWins],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRounds({ data: { before: pageParam, bigWins } }),
    getNextPageParam: (last) => (last.length === 60 ? last[last.length - 1].created_at : undefined),
    refetchInterval: bigWins ? false : 10_000,
  });
  const rows = q.data?.pages.flat() ?? [];
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  return (
    <Panel flush>
      <Table
        loading={q.isLoading}
        head={["Quando", "Jogador", "Jogo", "Aposta", "Ganho", "Saldo depois", "Situação"]}
        empty={
          !q.isLoading && !rows.length ? (
            <Empty>
              Nenhuma rodada ainda. Elas aparecem aqui assim que a PlayFivers estiver ligada.
            </Empty>
          ) : null
        }
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>
              <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDateTime(r.created_at)}
              </span>
            </Td>
            <Td>
              <PlayerLink user={r.user} id={r.user_id} />
            </Td>
            <Td>
              <span className="block max-w-[220px] truncate font-medium">
                {r.game?.name ?? r.game_code}
              </span>
              <span className="text-[12px] text-muted-foreground">{r.provider}</span>
            </Td>
            <Td right>
              <Money value={r.bet} />
            </Td>
            <Td right>
              <Money value={r.win} className={r.win > 0 ? "font-semibold text-gold" : ""} />
            </Td>
            <Td right>
              <Money value={Number(r.after_balance ?? 0)} />
            </Td>
            <Td>
              <StatusPill status={r.status} />
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
  );
}

function Games() {
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const fetchStats = useServerFn(getGameStats);
  const q = useQuery({
    queryKey: ["admin-game-stats", days],
    queryFn: () => fetchStats({ data: { days: Number(days) } }),
  });
  return (
    <Panel
      flush
      title="Jogos com mais apostas"
      actions={
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { id: "1", label: "24h" },
            { id: "7", label: "7 dias" },
            { id: "30", label: "30 dias" },
          ]}
        />
      }
    >
      <Table
        loading={q.isLoading}
        head={["Jogo", "Rodadas", "Jogadores", "Apostado", "Pago", "GGR", "Retorno real"]}
        empty={q.data && !q.data.length ? <Empty>Sem rodadas no período.</Empty> : null}
      >
        {q.data?.map((g) => (
          <tr key={`${g.provider}-${g.game_code}`}>
            <Td>
              <span className="font-medium">{g.game_name ?? g.game_code}</span>
              <span className="block text-[12px] text-muted-foreground">{g.provider}</span>
            </Td>
            <Td right>
              <span className="num">{Number(g.rounds).toLocaleString("pt-BR")}</span>
            </Td>
            <Td right>
              <span className="num">{Number(g.players).toLocaleString("pt-BR")}</span>
            </Td>
            <Td right>
              <Money value={g.bets} />
            </Td>
            <Td right>
              <Money value={g.wins} />
            </Td>
            <Td right>
              <Money value={g.ggr} className="font-semibold" />
            </Td>
            <Td right>
              <span className="num text-muted-foreground">
                {g.bets > 0 ? `${((g.wins / g.bets) * 100).toFixed(1).replace(".", ",")}%` : "–"}
              </span>
            </Td>
          </tr>
        ))}
      </Table>
      <p className="border-t border-border px-5 py-3 text-[12.5px] text-muted-foreground">
        Retorno real é quanto o jogo pagou do que foi apostado no período. Com poucas rodadas ele
        varia muito em torno do RTP do provedor.
      </p>
    </Panel>
  );
}

function PfLog() {
  const fetchLog = useServerFn(listPfLog);
  const q = useInfiniteQuery({
    queryKey: ["admin-pf-log"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchLog({ data: { before: pageParam } }),
    getNextPageParam: (last) => (last.length === 60 ? last[last.length - 1].created_at : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <Panel flush title="Chamadas da PlayFivers que fugiram do normal">
      <Table
        loading={q.isLoading}
        head={[
          "Quando",
          "Tipo",
          "Jogador",
          "Transação",
          "Resposta",
          "Resultado",
          "Saldo nosso",
          "Saldo deles",
        ]}
        empty={
          !q.isLoading && !rows.length ? (
            <Empty>Nenhum aviso. Rodadas normais ficam só em Rodadas ao vivo.</Empty>
          ) : null
        }
      >
        {rows.map((l) => (
          <tr key={l.id}>
            <Td>
              <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDateTime(l.created_at)}
              </span>
            </Td>
            <Td>{l.kind}</Td>
            <Td>
              {l.user_id ? (
                <Link
                  to="/admin/usuarios/$id"
                  params={{ id: l.user_id }}
                  className="font-medium hover:text-primary"
                >
                  {l.user?.username ?? l.user_id.slice(0, 8)}
                </Link>
              ) : (
                "–"
              )}
            </Td>
            <Td>
              <span className="block max-w-[150px] truncate font-mono text-[12px] text-muted-foreground">
                {l.txn_id ?? "–"}
              </span>
            </Td>
            <Td>
              <span className="num">{l.http_status}</span>
            </Td>
            <Td>{RESULT[l.result] ?? l.result}</Td>
            <Td right>{l.balance !== null ? <Money value={Number(l.balance)} /> : "–"}</Td>
            <Td right>
              {l.provider_balance !== null ? <Money value={Number(l.provider_balance)} /> : "–"}
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
  );
}
