import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { AccountLayout, EmptyState, SubTabs } from "@/components/account/account-layout";
import { PaymentRow } from "@/components/account/payment-row";
import { Button } from "@/components/ui/button";
import {
  listMyCasinoRounds,
  listMyLedger,
  listMyPayments,
  listMySportsBets,
  type LedgerKind,
} from "@/lib/wallet.functions";
import { formatBRL, formatWhen } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { cn } from "@/lib/utils";

type Aba = "extrato" | "cassino" | "esportes" | "pagamentos";

export const Route = createFileRoute("/_authenticated/historico")({
  validateSearch: (s: Record<string, unknown>): { aba?: Aba } => ({
    aba: s.aba === "cassino" || s.aba === "esportes" || s.aba === "pagamentos" ? s.aba : undefined,
  }),
  head: () => ({
    meta: pageMeta(
      "Extrato e apostas | apostamaxy",
      "Todas as movimentações do seu saldo, rodadas de cassino e apostas esportivas.",
    ),
  }),
  component: Page,
});

function Page() {
  const { aba = "extrato" } = Route.useSearch();
  const navigate = useNavigate({ from: "/historico" });
  return (
    <AccountLayout title="Extrato e apostas">
      <SubTabs<Aba>
        value={aba}
        onChange={(id) =>
          navigate({ search: { aba: id === "extrato" ? undefined : id }, replace: true })
        }
        options={[
          { id: "extrato", label: "Extrato" },
          { id: "cassino", label: "Cassino" },
          { id: "esportes", label: "Esportes" },
          { id: "pagamentos", label: "Depósitos e saques" },
        ]}
      />
      {aba === "extrato" && <Ledger />}
      {aba === "cassino" && <CasinoRounds />}
      {aba === "esportes" && <SportsBets />}
      {aba === "pagamentos" && <Payments />}
    </AccountLayout>
  );
}

const KIND_LABEL: Record<LedgerKind, string> = {
  opening: "Saldo inicial",
  deposit: "Depósito",
  withdrawal_hold: "Saque solicitado",
  withdrawal_release: "Saque devolvido",
  casino_bet: "Aposta no cassino",
  casino_win: "Ganho no cassino",
  casino_refund: "Estorno de rodada",
  sports_stake: "Aposta esportiva",
  sports_payout: "Prêmio de aposta",
  sports_refund: "Aposta anulada",
  adjustment: "Ajuste",
};

function Ledger() {
  const fetchLedger = useServerFn(listMyLedger);
  const q = useInfiniteQuery({
    queryKey: ["ledger"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchLedger({ data: { before: pageParam, kind: "all", limit: 40 } }),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p) => p.entries) ?? [];

  if (q.isLoading) return <ListSkeleton />;
  if (!rows.length)
    return (
      <EmptyState
        title="Nada por aqui ainda"
        body="Depósitos, apostas, ganhos e saques aparecem aqui assim que acontecerem."
      />
    );

  return (
    <div className="rounded-[14px] border border-border bg-surface">
      <div className="hidden grid-cols-[1fr_150px_150px] gap-4 border-b border-border px-5 py-3 text-[13px] font-semibold text-muted-foreground md:grid">
        <span>Movimentação</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Saldo depois</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 md:grid-cols-[1fr_150px_150px] md:px-5"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{KIND_LABEL[r.kind]}</p>
              <p className="truncate text-[13px] text-muted-foreground">
                {formatWhen(r.created_at)}
                {r.description && r.kind === "adjustment"
                  ? `, ${r.description.replace(/^Ajuste manual: /, "")}`
                  : ""}
              </p>
            </div>
            <p
              className={cn(
                "num text-right font-display text-[18px] font-bold",
                r.amount > 0 ? "text-live" : "text-foreground",
              )}
            >
              {r.amount > 0 ? "+" : "−"}
              {formatBRL(Math.abs(r.amount))}
            </p>
            <p className="num col-start-2 text-right text-[13px] text-muted-foreground md:col-start-auto md:text-[15px] md:text-foreground/80">
              {formatBRL(r.balance_after)}
            </p>
          </li>
        ))}
      </ul>
      {q.hasNextPage && (
        <div className="border-t border-border p-3 text-center">
          <Button
            variant="ghost"
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
            className="h-10 rounded-[10px]"
          >
            {q.isFetchingNextPage ? <Loader2 className="animate-spin" /> : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}

function CasinoRounds() {
  const fetchRounds = useServerFn(listMyCasinoRounds);
  const q = useInfiniteQuery({
    queryKey: ["casino-rounds"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRounds({ data: { before: pageParam } }),
    getNextPageParam: (last) => (last.length === 50 ? last[last.length - 1].created_at : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (!rows.length)
    return (
      <EmptyState
        title="Nenhuma rodada ainda"
        body="Cada giro ou mão jogada no cassino aparece aqui com aposta e ganho."
        action={
          <Link to="/" className="text-[14px] font-semibold text-primary">
            Ir para o cassino
          </Link>
        }
      />
    );

  return (
    <div className="rounded-[14px] border border-border bg-surface">
      <ul className="divide-y divide-border">
        {rows.map((r) => {
          const net = r.win - r.bet;
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
              {r.game?.image_url ? (
                <img
                  src={r.game.image_url}
                  alt=""
                  width={36}
                  height={48}
                  loading="lazy"
                  className="h-12 w-9 shrink-0 rounded-[6px] object-cover"
                />
              ) : (
                <span className="h-12 w-9 shrink-0 rounded-[6px] bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">
                  {r.game?.name ?? r.game_code ?? "Jogo"}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {formatWhen(r.created_at)}
                  {r.status === "refunded" ? ", estornada" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-[13px] text-muted-foreground">Aposta {formatBRL(r.bet)}</p>
                <p
                  className={cn(
                    "num font-display text-[18px] font-bold",
                    net > 0 ? "text-gold" : net < 0 ? "text-foreground/70" : "text-foreground",
                  )}
                >
                  {r.win > 0 ? `Ganhou ${formatBRL(r.win)}` : "Sem ganho"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {q.hasNextPage && (
        <div className="border-t border-border p-3 text-center">
          <Button
            variant="ghost"
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
            className="h-10 rounded-[10px]"
          >
            {q.isFetchingNextPage ? <Loader2 className="animate-spin" /> : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}

const PICK: Record<string, string> = { home: "Casa", draw: "Empate", away: "Fora" };
const BET_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "Em aberto", tone: "text-primary" },
  won: { label: "Ganhou", tone: "text-gold" },
  lost: { label: "Perdeu", tone: "text-muted-foreground" },
  void: { label: "Anulada", tone: "text-muted-foreground" },
};

function SportsBets() {
  const fetchBets = useServerFn(listMySportsBets);
  const q = useQuery({
    queryKey: ["sports-bets"],
    queryFn: () => fetchBets({ data: { status: "all" } }),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (!rows.length)
    return (
      <EmptyState
        title="Nenhuma aposta esportiva"
        body="Suas apostas ficam aqui até o jogo terminar, e depois com o resultado."
        action={
          <Link to="/esportes" className="text-[14px] font-semibold text-primary">
            Ver jogos
          </Link>
        }
      />
    );

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {rows.map((b) => {
        const s = BET_STATUS[b.status] ?? BET_STATUS.open;
        return (
          <li key={b.id} className="rounded-[14px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-muted-foreground">
                  {b.league_name ?? b.league}, {formatWhen(b.starts_at)}
                </p>
                <p className="truncate text-[16px] font-semibold">
                  {b.home} x {b.away}
                </p>
              </div>
              <span className={cn("shrink-0 text-[13.5px] font-bold", s.tone)}>{s.label}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-[10px] bg-background p-3">
              <div>
                <p className="text-[12px] text-muted-foreground">Palpite</p>
                <p className="text-[14.5px] font-semibold">
                  {PICK[b.pick]}{" "}
                  <span className="num text-muted-foreground">@{b.odd.toFixed(2)}</span>
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground">Aposta</p>
                <p className="num text-[14.5px] font-semibold">{formatBRL(b.stake)}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-muted-foreground">
                  {b.status === "won" ? "Recebeu" : b.status === "void" ? "Devolvido" : "Retorno"}
                </p>
                <p className={cn("num text-[14.5px] font-bold", b.status === "won" && "text-gold")}>
                  {formatBRL(b.status === "void" ? b.stake : b.potential_payout)}
                </p>
              </div>
            </div>
            {b.score_home !== null && b.score_away !== null && (
              <p className="num mt-2 text-[13px] text-muted-foreground">
                Placar final {b.score_home} x {b.score_away}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Payments() {
  const fetchPayments = useServerFn(listMyPayments);
  const q = useQuery({ queryKey: ["payments"], queryFn: () => fetchPayments() });
  if (q.isLoading) return <ListSkeleton />;
  if (!q.data?.length)
    return (
      <EmptyState
        title="Nenhum depósito ou saque"
        body="Quando você depositar ou sacar, o status de cada pagamento aparece aqui."
      />
    );
  return (
    <div className="rounded-[14px] border border-border bg-surface px-4 md:px-5">
      <ul className="divide-y divide-border">
        {q.data.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
      </ul>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-[12px]" />
      ))}
    </div>
  );
}
