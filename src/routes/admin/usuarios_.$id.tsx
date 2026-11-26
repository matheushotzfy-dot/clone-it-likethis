import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  adjustBalance,
  deletePlayer,
  getPlayer,
  listPlayerActivity,
  listPlayerBets,
  listPlayerLedger,
  listPlayerPayments,
  listPlayerRounds,
  setTransactionStatus,
  updatePlayer,
} from "@/lib/admin.functions";
import { requestKycForTransaction } from "@/lib/kyc.functions";
import {
  Empty,
  ErrorBox,
  LoadMore,
  Money,
  Panel,
  Segmented,
  Stat,
  StatusPill,
  Table,
  Td,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatWhen,
  newRequestId,
  parseBRL,
} from "@/lib/format";
import { maskCPF, maskPhone } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Tab = "extrato" | "cassino" | "esportes" | "pagamentos" | "atividade" | "limites";

export const Route = createFileRoute("/admin/usuarios_/$id")({
  validateSearch: (s: Record<string, unknown>): { aba?: Tab } => ({
    aba: typeof s.aba === "string" ? (s.aba as Tab) : undefined,
  }),
  head: () => ({ meta: [{ title: "Jogador | admin" }] }),
  component: Page,
});

const KIND: Record<string, string> = {
  opening: "Saldo inicial",
  deposit: "Depósito",
  withdrawal_hold: "Saque pedido (reserva)",
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
  const { id } = Route.useParams();
  const { aba = "extrato" } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/usuarios/$id" });
  const fetchPlayer = useServerFn(getPlayer);
  const q = useQuery({
    queryKey: ["admin-player", id],
    queryFn: () => fetchPlayer({ data: { id } }),
  });
  const [dialog, setDialog] = useState<null | "adjust" | "freeze" | "edit" | "delete">(null);

  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data)
    return (
      <div className="space-y-3">
        <div className="skeleton h-28 rounded-[12px]" />
        <div className="skeleton h-64 rounded-[12px]" />
      </div>
    );
  const { profile: p, summary: s } = q.data;

  return (
    <div className="space-y-5">
      <Link
        to="/admin/usuarios"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Jogadores
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[30px] md:text-[34px]">{p.full_name || p.username}</h1>
            <StatusPill status={p.is_frozen ? "frozen" : "active"} />
            {q.data.isAdmin && <StatusPill status="open" label="Administrador" />}
            {p.kyc_verified && <StatusPill status="approved" label="Documento verificado" />}
          </div>
          <p className="num mt-1 text-[14px] text-muted-foreground">
            @{p.username}, CPF {p.cpf ? maskCPF(p.cpf) : "não informado"},{" "}
            {q.data.email || "sem e-mail"}
            {q.data.emailConfirmed ? "" : " (não confirmado)"}
          </p>
          {p.is_frozen && p.freeze_reason && (
            <p className="mt-2 max-w-2xl rounded-[8px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13.5px]">
              Motivo da suspensão: {p.freeze_reason}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setDialog("adjust")}
            className="h-10 rounded-[10px] font-bold shadow-none"
          >
            Ajustar saldo
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDialog("freeze")}
            className="h-10 rounded-[10px] shadow-none"
          >
            {p.is_frozen ? "Reativar conta" : "Suspender conta"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDialog("edit")}
            className="h-10 rounded-[10px] shadow-none"
          >
            Editar dados
          </Button>
          {(q.data.reconciliation.entries ?? 0) === 0 && (
            <Button
              variant="ghost"
              onClick={() => setDialog("delete")}
              className="h-10 rounded-[10px] text-destructive hover:text-destructive"
            >
              Apagar
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 min-[1700px]:grid-cols-6">
        <Stat
          value={formatBRL(p.balance)}
          label="Saldo agora"
          sub={
            q.data.reconciliation.diff !== 0
              ? `Diferença de ${formatBRL(q.data.reconciliation.diff)} no extrato`
              : "Bate com o extrato"
          }
          tone={q.data.reconciliation.diff !== 0 ? "out" : undefined}
        />
        <Stat tone="in" value={formatBRL(s?.deposits ?? 0)} label="Depositou" />
        <Stat
          tone="out"
          value={formatBRL(s?.withdrawn ?? 0)}
          label="Sacou"
          sub={s?.withdrawPending ? `${formatBRL(s.withdrawPending)} pendente` : undefined}
        />
        <Stat value={formatBRL(s?.ggr ?? 0)} label="GGR do jogador" sub="Apostou menos ganhou" />
        <Stat
          value={formatBRL((s?.casinoBets ?? 0) + (s?.sportsStakes ?? 0))}
          label="Total apostado"
          sub={`Cassino ${formatBRL(s?.casinoBets ?? 0)}`}
        />
        <Stat value={formatBRL(s?.adjustments ?? 0)} label="Ajustes manuais" />
      </div>

      <Panel title="Cadastro">
        <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2 xl:grid-cols-4">
          <Info
            label="Nascimento"
            value={p.birth_date ? formatDate(`${p.birth_date}T12:00:00Z`) : "não informado"}
          />
          <Info label="Celular" value={p.phone ? maskPhone(p.phone) : "não informado"} />
          <Info label="Cadastro" value={formatDateTime(p.created_at)} />
          <Info
            label="Último login"
            value={q.data.lastSignIn ? formatDateTime(q.data.lastSignIn) : "nunca"}
          />
          <Info
            label="Última aposta"
            value={s?.lastBetAt ? formatDateTime(s.lastBetAt) : "nunca"}
          />
          <Info
            label="Origem"
            value={[p.utm_source, p.utm_campaign].filter(Boolean).join(", ") || "direto"}
          />
          <Info label="IP do cadastro" value={p.signup_ip ?? "não registrado"} />
          <Info label="Id" value={p.id} mono />
        </dl>
      </Panel>

      <Segmented<Tab>
        value={aba}
        onChange={(v) =>
          navigate({ search: { aba: v === "extrato" ? undefined : v }, replace: true })
        }
        options={[
          { id: "extrato", label: "Extrato" },
          { id: "cassino", label: "Cassino" },
          { id: "esportes", label: "Esportes" },
          { id: "pagamentos", label: "Depósitos e saques" },
          { id: "atividade", label: "Atividade e documentos" },
          { id: "limites", label: "Jogo responsável" },
        ]}
      />

      {aba === "extrato" && <LedgerTab id={id} />}
      {aba === "cassino" && <RoundsTab id={id} />}
      {aba === "esportes" && <BetsTab id={id} />}
      {aba === "pagamentos" && <PaymentsTab id={id} />}
      {aba === "atividade" && <ActivityTab id={id} />}
      {aba === "limites" && <LimitsTab limits={q.data.limits} />}

      <AdjustDialog
        open={dialog === "adjust"}
        onClose={() => setDialog(null)}
        userId={id}
        balance={p.balance}
      />
      <FreezeDialog
        open={dialog === "freeze"}
        onClose={() => setDialog(null)}
        userId={id}
        frozen={!!p.is_frozen}
      />
      <EditDialog
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
        userId={id}
        profile={p}
      />
      <DeleteDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        userId={id}
        name={p.full_name || p.username || "este jogador"}
      />
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono ? "font-mono text-[12.5px]" : "num")}>{value}</dd>
    </div>
  );
}

function useRefreshPlayer(id: string) {
  const qc = useQueryClient();
  return () => {
    for (const k of [
      "admin-player",
      "admin-player-ledger",
      "admin-player-payments",
      "admin-player-activity",
    ])
      qc.invalidateQueries({ queryKey: [k, id] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-players"] });
  };
}

function LedgerTab({ id }: { id: string }) {
  const fetchLedger = useServerFn(listPlayerLedger);
  const q = useInfiniteQuery({
    queryKey: ["admin-player-ledger", id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchLedger({ data: { id, before: pageParam } }),
    getNextPageParam: (last) => (last.length === 50 ? String(last[last.length - 1].id) : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <Panel flush>
      <Table
        rightCols={[3, 4, 5]}
        loading={q.isLoading}
        head={["Quando", "Movimentação", "Detalhe", "Valor", "Antes", "Depois"]}
        empty={!q.isLoading && !rows.length ? <Empty>Nenhuma movimentação.</Empty> : null}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>
              <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDateTime(r.created_at)}
              </span>
            </Td>
            <Td>
              <span className="font-medium">{KIND[r.kind] ?? r.kind}</span>
            </Td>
            <Td>
              <span className="block max-w-[320px] truncate text-[13px] text-muted-foreground">
                {r.description}
                {r.createdByName ? ` (por ${r.createdByName})` : ""}
              </span>
            </Td>
            <Td right>
              <Money value={r.amount} signed className="font-semibold" />
            </Td>
            <Td right>
              <Money value={r.balance_before} className="text-muted-foreground" />
            </Td>
            <Td right>
              <Money value={r.balance_after} />
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

function RoundsTab({ id }: { id: string }) {
  const fetchRounds = useServerFn(listPlayerRounds);
  const q = useInfiniteQuery({
    queryKey: ["admin-player-rounds", id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRounds({ data: { id, before: pageParam } }),
    getNextPageParam: (last) => (last.length === 50 ? last[last.length - 1].created_at : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <Panel flush>
      <Table
        rightCols={[3, 4, 5]}
        loading={q.isLoading}
        head={["Quando", "Jogo", "Rodada", "Aposta", "Ganho", "Saldo depois", "Situação"]}
        empty={!q.isLoading && !rows.length ? <Empty>Nenhuma rodada de cassino.</Empty> : null}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>
              <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDateTime(r.created_at)}
              </span>
            </Td>
            <Td>
              <span className="block max-w-[220px] truncate font-medium">
                {r.game?.name ?? r.game_code}
              </span>
              <span className="text-[12px] text-muted-foreground">{r.provider}</span>
            </Td>
            <Td>
              <span className="block max-w-[160px] truncate font-mono text-[12px] text-muted-foreground">
                {r.round_id || r.txn_id}
              </span>
            </Td>
            <Td right>
              <Money value={Number(r.bet)} />
            </Td>
            <Td right>
              <Money
                value={Number(r.win)}
                className={Number(r.win) > 0 ? "font-semibold text-gold" : ""}
              />
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

const PICK: Record<string, string> = { home: "Casa", draw: "Empate", away: "Fora" };

function BetsTab({ id }: { id: string }) {
  const fetchBets = useServerFn(listPlayerBets);
  const q = useQuery({
    queryKey: ["admin-player-bets", id],
    queryFn: () => fetchBets({ data: { id } }),
  });
  return (
    <Panel flush>
      <Table
        rightCols={[3, 4]}
        loading={q.isLoading}
        head={["Feita em", "Jogo", "Palpite", "Aposta", "Retorno", "Situação"]}
        empty={q.data && !q.data.length ? <Empty>Nenhuma aposta esportiva.</Empty> : null}
      >
        {q.data?.map((b) => (
          <tr key={b.id}>
            <Td>
              <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDateTime(b.created_at)}
              </span>
            </Td>
            <Td>
              <span className="block max-w-[260px] truncate font-medium">
                {b.home} x {b.away}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {b.league_name}, {formatWhen(b.starts_at)}
              </span>
            </Td>
            <Td>
              {PICK[b.pick]} <span className="num text-muted-foreground">@{b.odd.toFixed(2)}</span>
            </Td>
            <Td right>
              <Money value={b.stake} />
            </Td>
            <Td right>
              <Money
                value={b.status === "void" ? b.stake : b.potential_payout}
                className={b.status === "won" ? "font-semibold text-gold" : ""}
              />
            </Td>
            <Td>
              <StatusPill status={b.status} />
              {b.score_home !== null && (
                <span className="num ml-2 text-[12.5px] text-muted-foreground">
                  {b.score_home}x{b.score_away}
                </span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

function PaymentsTab({ id }: { id: string }) {
  const fetchPayments = useServerFn(listPlayerPayments);
  const setStatus = useServerFn(setTransactionStatus);
  const requestKyc = useServerFn(requestKycForTransaction);
  const refresh = useRefreshPlayer(id);
  const q = useQuery({
    queryKey: ["admin-player-payments", id],
    queryFn: () => fetchPayments({ data: { id } }),
  });
  const [reject, setReject] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const decide = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected"; reason?: string }) =>
      setStatus({ data: v }),
    onSuccess: () => {
      toast.success("Decisão registrada.");
      setReject(null);
      setReason("");
      refresh();
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const kyc = useMutation({
    mutationFn: (txId: string) => requestKyc({ data: { transactionId: txId } }),
    onSuccess: () => {
      toast.success("Pedido de documentos enviado ao jogador.");
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Panel flush>
      <Table
        rightCols={[2, 5]}
        loading={q.isLoading}
        head={["Quando", "Tipo", "Valor", "Detalhe", "Situação", ""]}
        empty={q.data && !q.data.length ? <Empty>Nenhum depósito ou saque.</Empty> : null}
      >
        {q.data?.map((t) => (
          <tr key={t.id}>
            <Td>
              <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDateTime(t.created_at)}
              </span>
            </Td>
            <Td>{t.type === "deposit" ? "Depósito" : "Saque"}</Td>
            <Td right>
              <Money value={t.amount} className="font-semibold" />
            </Td>
            <Td>
              <span className="block max-w-[280px] truncate text-[13px] text-muted-foreground">
                {t.pix_key ? `${t.pix_key}, ` : ""}
                {t.description}
              </span>
            </Td>
            <Td>
              <StatusPill status={t.status} />
              {t.kyc_required && t.status === "pending" && (
                <span className="ml-1.5 text-[12px] text-gold">documentos</span>
              )}
            </Td>
            <Td right>
              {t.type === "withdrawal" && t.status === "pending" && (
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    className="shadow-none"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: t.id, status: "approved" })}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shadow-none"
                    onClick={() => setReject(t.id)}
                  >
                    Recusar
                  </Button>
                  {!t.kyc_required && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={kyc.isPending}
                      onClick={() => kyc.mutate(t.id)}
                    >
                      Pedir documento
                    </Button>
                  )}
                </div>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent className="rounded-[14px] border-border bg-background">
          <DialogTitle className="text-[24px]">Recusar saque</DialogTitle>
          <DialogDescription>
            O valor volta para o saldo do jogador. Ele vê o motivo.
          </DialogDescription>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="field-input h-auto py-2.5"
            placeholder="Ex.: chave Pix não pertence ao titular"
          />
          <Button
            disabled={reason.trim().length < 3 || decide.isPending}
            onClick={() =>
              reject && decide.mutate({ id: reject, status: "rejected", reason: reason.trim() })
            }
            className="shadow-none"
          >
            {decide.isPending ? <Loader2 className="animate-spin" /> : "Recusar e devolver o valor"}
          </Button>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

const ACTION: Record<string, string> = {
  "wallet.adjust": "Ajustou o saldo",
  "user.update": "Editou dados",
  "user.freeze": "Suspendeu a conta",
  "user.unfreeze": "Reativou a conta",
  "withdrawal.approved": "Aprovou saque",
  "withdrawal.rejected": "Recusou saque",
  "deposit.approved": "Aprovou depósito manualmente",
  "deposit.rejected": "Recusou depósito",
  "sports_bet.settle": "Liquidou aposta manualmente",
  "kyc.review": "Revisou documentos",
};

function ActivityTab({ id }: { id: string }) {
  const fetchActivity = useServerFn(listPlayerActivity);
  const q = useQuery({
    queryKey: ["admin-player-activity", id],
    queryFn: () => fetchActivity({ data: { id } }),
  });
  if (!q.data) return <div className="skeleton h-48 rounded-[12px]" />;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Ações do admin nesta conta" flush>
        {q.data.audit.length === 0 ? (
          <Empty>Nenhuma ação registrada.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {q.data.audit.map((a) => (
              <li key={a.id} className="px-5 py-3 text-[14px]">
                <p>
                  <span className="font-semibold">{a.adminName}</span>{" "}
                  {ACTION[a.action]?.toLowerCase() ?? a.action}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {formatDateTime(a.created_at)}
                  {detail(a.details as Record<string, unknown>)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="space-y-4">
        <Panel title="Documentos enviados" flush>
          {q.data.kyc.length === 0 ? (
            <Empty>Nenhum documento enviado.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {q.data.kyc.map((k) => (
                <li key={k.id} className="flex items-center justify-between px-5 py-3 text-[14px]">
                  <span>
                    {k.document_type.toUpperCase()}, {formatDateTime(k.created_at)}
                    {k.rejection_reason ? `, ${k.rejection_reason}` : ""}
                  </span>
                  <StatusPill status={k.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border px-5 py-3">
            <Link
              to="/admin/kyc"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              Abrir fila de documentos
            </Link>
          </div>
        </Panel>
        <Panel title="Jogos abertos" flush>
          {q.data.launches.length === 0 ? (
            <Empty>Nunca abriu um jogo.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {q.data.launches.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 text-[14px]"
                >
                  <span className="min-w-0 truncate">{l.game_name ?? l.game_code}</span>
                  <span className="num shrink-0 text-[12.5px] text-muted-foreground">
                    {l.ok ? "" : "falhou, "}
                    {formatWhen(l.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function detail(d: Record<string, unknown> | null) {
  if (!d) return "";
  const parts: string[] = [];
  if (typeof d.delta === "number") parts.push(`${d.delta > 0 ? "+" : ""}${formatBRL(d.delta)}`);
  if (typeof d.amount === "number") parts.push(formatBRL(d.amount));
  if (typeof d.reason === "string" && d.reason) parts.push(`motivo: ${d.reason}`);
  if (typeof d.freeze_reason === "string" && d.freeze_reason)
    parts.push(`motivo: ${d.freeze_reason}`);
  return parts.length ? `, ${parts.join(", ")}` : "";
}

function LimitsTab({ limits }: { limits: Record<string, unknown> | null }) {
  const v = (k: string) =>
    limits?.[k] === null || limits?.[k] === undefined ? "sem limite" : formatBRL(Number(limits[k]));
  const until = limits?.self_excluded_until as string | null | undefined;
  return (
    <Panel title="Limites definidos pelo jogador">
      <dl className="grid gap-4 text-[14px] sm:grid-cols-2 xl:grid-cols-3">
        <Info label="Depósito por dia" value={v("deposit_daily")} />
        <Info label="Depósito por semana" value={v("deposit_weekly")} />
        <Info label="Depósito por mês" value={v("deposit_monthly")} />
        <Info label="Perda por dia" value={v("loss_daily")} />
        <Info
          label="Aviso de sessão"
          value={limits?.session_minutes ? `${limits.session_minutes} min` : "sem aviso"}
        />
        <Info
          label="Autoexclusão"
          value={until && new Date(until) > new Date() ? `até ${formatDateTime(until)}` : "não"}
        />
      </dl>
      <p className="mt-4 text-[13px] text-muted-foreground">
        Esses limites são do jogador. O admin não reduz nem remove autoexclusão.
      </p>
    </Panel>
  );
}

function AdjustDialog({
  open,
  onClose,
  userId,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  balance: number;
}) {
  const adjust = useServerFn(adjustBalance);
  const refresh = useRefreshPlayer(userId);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [raw, setRaw] = useState("");
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const amount = parseBRL(raw);
  const delta = direction === "credit" ? amount : -amount;
  const m = useMutation({
    mutationFn: () => adjust({ data: { userId, delta, reason: reason.trim(), requestId } }),
    onSuccess: (r) => {
      toast.success(`Saldo ajustado. Novo saldo ${formatBRL(r.balance)}.`);
      refresh();
      setRaw("");
      setReason("");
      setRequestId(newRequestId());
      onClose();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRequestId(newRequestId());
    },
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-[14px] border-border bg-background">
        <DialogTitle className="text-[24px]">Ajustar saldo</DialogTitle>
        <DialogDescription>
          Fica registrado no extrato do jogador e na auditoria, com o seu usuário e o motivo. Saldo
          atual {formatBRL(balance)}.
        </DialogDescription>
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { id: "credit", label: "Creditar" },
            { id: "debit", label: "Debitar" },
          ]}
        />
        <label className="block">
          <span className="mb-1 block text-[13.5px] font-semibold">Valor</span>
          <input
            className="field-input num"
            inputMode="decimal"
            placeholder="0,00"
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d,]/g, ""))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13.5px] font-semibold">Motivo</span>
          <input
            className="field-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: crédito de teste da homologação"
          />
        </label>
        {amount > 0 && (
          <p className="num text-[14px] text-muted-foreground">
            Saldo depois: <strong className="text-foreground">{formatBRL(balance + delta)}</strong>
          </p>
        )}
        <Button
          disabled={amount <= 0 || reason.trim().length < 3 || balance + delta < 0 || m.isPending}
          onClick={() => m.mutate()}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {m.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            `${direction === "credit" ? "Creditar" : "Debitar"} ${formatBRL(amount)}`
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function FreezeDialog({
  open,
  onClose,
  userId,
  frozen,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  frozen: boolean;
}) {
  const update = useServerFn(updatePlayer);
  const refresh = useRefreshPlayer(userId);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () =>
      update({
        data: frozen
          ? { userId, is_frozen: false }
          : { userId, is_frozen: true, freeze_reason: reason.trim() },
      }),
    onSuccess: () => {
      toast.success(frozen ? "Conta reativada." : "Conta suspensa.");
      refresh();
      setReason("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-[14px] border-border bg-background">
        <DialogTitle className="text-[24px]">
          {frozen ? "Reativar conta" : "Suspender conta"}
        </DialogTitle>
        <DialogDescription>
          {frozen
            ? "O jogador volta a poder depositar e apostar."
            : "O jogador não consegue depositar nem apostar. O saldo continua dele e o saque segue liberado."}
        </DialogDescription>
        {!frozen && (
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold">Motivo (o jogador vê)</span>
            <textarea
              rows={3}
              className="field-input h-auto py-2.5"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: conta em análise por cadastro duplicado"
            />
          </label>
        )}
        <Button
          variant={frozen ? "default" : "destructive"}
          disabled={(!frozen && reason.trim().length < 5) || m.isPending}
          onClick={() => m.mutate()}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {m.isPending ? <Loader2 className="animate-spin" /> : frozen ? "Reativar" : "Suspender"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  open,
  onClose,
  userId,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    birth_date: string | null;
    kyc_verified: boolean | null;
  };
}) {
  const update = useServerFn(updatePlayer);
  const refresh = useRefreshPlayer(userId);
  const [name, setName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(maskPhone(profile.phone ?? ""));
  const [birth, setBirth] = useState(profile.birth_date ?? "");
  const [verified, setVerified] = useState(!!profile.kyc_verified);
  const m = useMutation({
    mutationFn: () =>
      update({
        data: {
          userId,
          full_name: name.trim() && name.trim() !== profile.full_name ? name.trim() : undefined,
          phone:
            phone.replace(/\D/g, "") && phone.replace(/\D/g, "") !== profile.phone
              ? phone.replace(/\D/g, "")
              : undefined,
          birth_date: birth && birth !== profile.birth_date ? birth : undefined,
          kyc_verified: verified !== !!profile.kyc_verified ? verified : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Dados atualizados.");
      refresh();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-[14px] border-border bg-background">
        <DialogTitle className="text-[24px]">Editar dados</DialogTitle>
        <DialogDescription>
          CPF não muda. Para outro CPF, o jogador precisa de uma conta nova.
        </DialogDescription>
        <label className="block">
          <span className="mb-1 block text-[13.5px] font-semibold">Nome completo</span>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13.5px] font-semibold">Celular</span>
          <input
            className="field-input num"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13.5px] font-semibold">Nascimento</span>
          <input
            type="date"
            className="field-input"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            className="size-[18px] accent-[var(--primary)]"
          />{" "}
          Documento verificado
        </label>
        <Button
          disabled={m.isPending}
          onClick={() => m.mutate()}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {m.isPending ? <Loader2 className="animate-spin" /> : "Salvar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  onClose,
  userId,
  name,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  name: string;
}) {
  const del = useServerFn(deletePlayer);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => del({ data: { userId } }),
    onSuccess: () => {
      toast.success("Conta apagada.");
      qc.invalidateQueries({ queryKey: ["admin-players"] });
      navigate({ to: "/admin/usuarios" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-[14px] border-border bg-background">
        <DialogTitle className="text-[24px]">Apagar {name}?</DialogTitle>
        <DialogDescription>
          Só é possível para contas sem nenhuma movimentação de saldo. Não dá para desfazer.
        </DialogDescription>
        <Button
          variant="destructive"
          disabled={m.isPending}
          onClick={() => m.mutate()}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {m.isPending ? <Loader2 className="animate-spin" /> : "Apagar conta"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
