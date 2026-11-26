import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createAdSpend,
  createGatewayRecon,
  deleteAdSpend,
  deleteGatewayRecon,
  getFinanceSummary,
  listAdSpend,
  listGatewayRecon,
} from "@/lib/finance.functions";
import {
  Empty,
  ErrorBox,
  Money,
  PageHeader,
  Panel,
  Segmented,
  Stat,
  Table,
  Td,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate, parseBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro | admin" }] }),
  component: Page,
});

type Preset = "today" | "7d" | "month" | "last_month" | "90d" | "custom";
const PLATFORMS = [
  { id: "meta", label: "Meta" },
  { id: "google", label: "Google" },
  { id: "tiktok", label: "TikTok" },
  { id: "kwai", label: "Kwai" },
  { id: "influencer", label: "Influenciador" },
  { id: "outro", label: "Outro" },
] as const;
type Platform = (typeof PLATFORMS)[number]["id"];

/** Data de hoje no fuso de São Paulo (AAAA-MM-DD). */
function spToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function shift(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function rangeFor(p: Exclude<Preset, "custom">): { from: string; to: string } {
  const t = spToday();
  if (p === "today") return { from: t, to: t };
  if (p === "7d") return { from: shift(t, -6), to: t };
  if (p === "90d") return { from: shift(t, -89), to: t };
  const first = `${t.slice(0, 8)}01`;
  if (p === "month") return { from: first, to: t };
  const lastPrev = shift(first, -1);
  return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
}

function Page() {
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState(() => rangeFor("month"));
  const range = useMemo(() => (preset === "custom" ? custom : rangeFor(preset)), [preset, custom]);
  const fetchSummary = useServerFn(getFinanceSummary);
  const s = useQuery({
    queryKey: ["admin-finance", range],
    queryFn: () => fetchSummary({ data: range }),
    placeholderData: keepPreviousData,
  });
  const d = s.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Dinheiro que entrou e saiu de verdade, resultado dos jogos e custos. Créditos de teste lançados pelo admin não contam como depósito."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Preset>
          value={preset}
          onChange={setPreset}
          options={[
            { id: "today", label: "Hoje" },
            { id: "7d", label: "7 dias" },
            { id: "month", label: "Este mês" },
            { id: "last_month", label: "Mês passado" },
            { id: "90d", label: "90 dias" },
            { id: "custom", label: "Escolher datas" },
          ]}
        />
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-[14px]">
            <input
              type="date"
              className="field-input h-10 w-[160px]"
              value={custom.from}
              max={custom.to}
              onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })}
              aria-label="De"
            />
            <span className="text-muted-foreground">até</span>
            <input
              type="date"
              className="field-input h-10 w-[160px]"
              value={custom.to}
              min={custom.from}
              max={spToday()}
              onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })}
              aria-label="Até"
            />
          </div>
        )}
        {s.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {s.error ? (
        <ErrorBox error={s.error} onRetry={() => s.refetch()} />
      ) : !d ? (
        <div className="skeleton h-40 rounded-[12px]" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Entrou por Pix"
              value={formatBRL(d.deposits)}
              tone="in"
              sub={`${d.depositsCount} depósitos de ${d.depositors} jogadores`}
            />
            <Stat
              label="Saiu por Pix"
              value={formatBRL(d.paidOut)}
              tone="out"
              sub={`${d.withdrawalsCount} saques pagos${d.withdrawalFees > 0 ? `, ${formatBRL(d.withdrawalFees)} de taxa retida` : ""}`}
            />
            <Stat label="Caixa do período" value={<Signed v={d.cash} />} sub="Entrou menos saiu" />
            <Stat
              label="Lucro depois dos custos"
              value={<Signed v={d.net} />}
              tone={d.net >= 0 ? "gold" : undefined}
              sub={
                d.roi !== null
                  ? `Retorno de ${d.roi.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% sobre anúncio`
                  : "Sem gasto de anúncio lançado"
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Resultado dos jogos">
              <dl className="space-y-0 divide-y divide-border text-[14px]">
                <Line label="Cassino: apostado" value={formatBRL(d.casinoBets)} />
                <Line label="Cassino: pago em prêmios e estornos" value={formatBRL(d.casinoWins)} />
                <Line label="Cassino: ficou com a casa" value={<Signed v={d.casinoGgr} />} strong />
                <Line label="Esportes: apostado" value={formatBRL(d.sportsStakes)} />
                <Line
                  label="Esportes: pago em prêmios e anulações"
                  value={formatBRL(d.sportsReturns)}
                />
                <Line
                  label="Esportes: ficou com a casa"
                  value={<Signed v={d.sportsGgr} />}
                  strong
                />
                <Line label="GGR total" value={<Signed v={d.ggr} />} strong />
              </dl>
              {d.adjustments !== 0 && (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  Ajustes manuais do admin no período: <Money value={d.adjustments} signed />. Eles
                  mexem no saldo dos jogadores mas não entram como depósito.
                </p>
              )}
            </Panel>

            <Panel title="O que a casa deve agora">
              <dl className="divide-y divide-border text-[14px]">
                <Line
                  label="Saldo na conta dos jogadores"
                  value={formatBRL(d.liability)}
                  strong
                  hint="Pode virar saque a qualquer momento. Deixe esse valor disponível no gateway."
                />
                <Line
                  label="Saques esperando pagamento"
                  value={formatBRL(d.pendingWithdrawals)}
                  hint="Já saíram do saldo dos jogadores e estão reservados."
                />
                {d.cpa !== null && (
                  <Line
                    label="Custo por depositante"
                    value={formatBRL(d.cpa)}
                    hint="Anúncio do período dividido por quem depositou no período."
                  />
                )}
                {d.gatewayDiff !== null && (
                  <Line
                    label="Gateway contra o sistema"
                    value={
                      <span className={cn(Math.abs(d.gatewayDiff) >= 0.01 && "text-gold")}>
                        <Signed v={d.gatewayDiff} />
                      </span>
                    }
                    hint={
                      Math.abs(d.gatewayDiff) < 0.01
                        ? "O que o gateway diz que recebeu bate com os depósitos creditados."
                        : "Diferença entre o valor que você lançou da conciliação e os depósitos creditados. Confira depósitos pendentes."
                    }
                  />
                )}
              </dl>
            </Panel>
          </div>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <AdSpendPanel range={range} />
        <ReconPanel range={range} />
      </div>
    </div>
  );
}

function Signed({ v }: { v: number }) {
  return (
    <span className="num">
      {v < 0 ? "−" : ""}
      {formatBRL(Math.abs(v))}
    </span>
  );
}

function Line({
  label,
  value,
  strong,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <dt className={cn(strong ? "font-semibold" : "text-muted-foreground")}>{label}</dt>
        <dd className={cn("num shrink-0", strong && "font-display text-[18px] font-bold")}>
          {value}
        </dd>
      </div>
      {hint && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin-finance"] });
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
    qc.invalidateQueries({ queryKey: ["admin-recon"] });
  };
}

function AdSpendPanel({ range }: { range: { from: string; to: string } }) {
  const invalidate = useInvalidateFinance();
  const list = useServerFn(listAdSpend);
  const add = useServerFn(createAdSpend);
  const del = useServerFn(deleteAdSpend);
  const q = useQuery({ queryKey: ["admin-ads", range], queryFn: () => list({ data: range }) });
  const [form, setForm] = useState({
    date: spToday(),
    amount: "",
    platform: "meta" as Platform,
    campaign: "",
  });
  const addM = useMutation({
    mutationFn: () =>
      add({
        data: {
          spend_date: form.date,
          amount: parseBRL(form.amount),
          platform: form.platform,
          campaign: form.campaign || null,
        },
      }),
    onSuccess: () => {
      toast.success("Gasto lançado.");
      setForm({ ...form, amount: "", campaign: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const total = (q.data ?? []).reduce((a, r) => a + r.amount, 0);
  return (
    <Panel
      flush
      title="Gasto com anúncio"
      actions={
        <span className="num text-[14px] text-muted-foreground">{formatBRL(total)} no período</span>
      }
    >
      <form
        className="grid gap-2 border-b border-border p-4 sm:grid-cols-[140px_1fr_130px] md:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (parseBRL(form.amount) > 0) addM.mutate();
          else toast.error("Digite o valor gasto.");
        }}
      >
        <input
          type="date"
          className="field-input h-11"
          value={form.date}
          max={spToday()}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          aria-label="Dia"
        />
        <input
          className="field-input num h-11"
          inputMode="decimal"
          placeholder="Valor gasto, ex.: 350,00"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d,.]/g, "") })}
          aria-label="Valor"
        />
        <select
          className="field-input h-11"
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
          aria-label="Onde"
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          className="field-input h-11 sm:col-span-2"
          placeholder="Campanha (opcional)"
          maxLength={120}
          value={form.campaign}
          onChange={(e) => setForm({ ...form, campaign: e.target.value })}
          aria-label="Campanha"
        />
        <Button
          type="submit"
          disabled={addM.isPending}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {addM.isPending ? <Loader2 className="animate-spin" /> : "Lançar gasto"}
        </Button>
      </form>
      <Table
        loading={q.isLoading}
        head={["Dia", "Onde", "Campanha", "Valor", ""]}
        empty={q.data && !q.data.length ? <Empty>Nenhum gasto lançado nesse período.</Empty> : null}
      >
        {q.data?.map((r) => (
          <tr key={r.id}>
            <Td>
              <span className="num text-[13.5px]">{formatDate(r.spend_date)}</span>
            </Td>
            <Td>{PLATFORMS.find((p) => p.id === r.platform)?.label ?? r.platform}</Td>
            <Td>
              <span className="block max-w-[200px] truncate text-[13.5px] text-muted-foreground">
                {r.campaign || "–"}
              </span>
            </Td>
            <Td right>
              <Money value={r.amount} />
            </Td>
            <Td right>
              <RemoveButton
                onConfirm={() => delM.mutate(r.id)}
                label={`Apagar gasto de ${formatBRL(r.amount)}`}
              />
            </Td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

function ReconPanel({ range }: { range: { from: string; to: string } }) {
  const invalidate = useInvalidateFinance();
  const list = useServerFn(listGatewayRecon);
  const add = useServerFn(createGatewayRecon);
  const del = useServerFn(deleteGatewayRecon);
  const q = useQuery({ queryKey: ["admin-recon", range], queryFn: () => list({ data: range }) });
  const [form, setForm] = useState({ date: spToday(), real: "", fees: "", notes: "" });
  const addM = useMutation({
    mutationFn: () =>
      add({
        data: {
          ref_date: form.date,
          real_amount: parseBRL(form.real),
          fees: parseBRL(form.fees || "0"),
          notes: form.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Conciliação lançada.");
      setForm({ ...form, real: "", fees: "", notes: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Panel flush title="Conciliação do gateway">
      <p className="px-4 pt-4 text-[13.5px] text-muted-foreground md:px-5">
        Lance o que o extrato do gateway mostra por dia: quanto entrou e quanto ele cobrou de taxa.
        Serve para conferir com os depósitos creditados.
      </p>
      <form
        className="grid gap-2 border-b border-border p-4 sm:grid-cols-[140px_1fr_1fr] md:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.real) addM.mutate();
          else toast.error("Digite quanto entrou no gateway.");
        }}
      >
        <input
          type="date"
          className="field-input h-11"
          value={form.date}
          max={spToday()}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          aria-label="Dia"
        />
        <input
          className="field-input num h-11"
          inputMode="decimal"
          placeholder="Entrou no gateway"
          value={form.real}
          onChange={(e) => setForm({ ...form, real: e.target.value.replace(/[^\d,.]/g, "") })}
          aria-label="Entrou no gateway"
        />
        <input
          className="field-input num h-11"
          inputMode="decimal"
          placeholder="Taxas cobradas"
          value={form.fees}
          onChange={(e) => setForm({ ...form, fees: e.target.value.replace(/[^\d,.]/g, "") })}
          aria-label="Taxas"
        />
        <input
          className="field-input h-11 sm:col-span-2"
          placeholder="Observação (opcional)"
          maxLength={500}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          aria-label="Observação"
        />
        <Button
          type="submit"
          disabled={addM.isPending}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {addM.isPending ? <Loader2 className="animate-spin" /> : "Lançar"}
        </Button>
      </form>
      <Table
        loading={q.isLoading}
        head={["Dia", "Entrou", "Taxas", "Observação", ""]}
        empty={q.data && !q.data.length ? <Empty>Nada lançado nesse período.</Empty> : null}
      >
        {q.data?.map((r) => (
          <tr key={r.id}>
            <Td>
              <span className="num text-[13.5px]">{formatDate(r.ref_date)}</span>
            </Td>
            <Td>
              <Money value={r.real_amount} />
            </Td>
            <Td>
              <Money value={r.fees} />
            </Td>
            <Td>
              <span className="block max-w-[200px] truncate text-[13.5px] text-muted-foreground">
                {r.notes || "–"}
              </span>
            </Td>
            <Td right>
              <RemoveButton onConfirm={() => delM.mutate(r.id)} label="Apagar lançamento" />
            </Td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

function RemoveButton({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  const [armed, setArmed] = useState(false);
  if (armed)
    return (
      <span className="inline-flex gap-1">
        <Button
          size="sm"
          variant="destructive"
          className="h-8 rounded-[8px]"
          onClick={() => {
            setArmed(false);
            onConfirm();
          }}
        >
          Apagar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 rounded-[8px]"
          onClick={() => setArmed(false)}
        >
          Não
        </Button>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      aria-label={label}
      className="grid size-8 place-items-center rounded-[8px] text-muted-foreground hover:bg-surface-2 hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
