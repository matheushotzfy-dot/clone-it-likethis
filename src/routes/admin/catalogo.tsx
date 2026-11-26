import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Search, Star } from "lucide-react";
import { toast } from "sonner";
import {
  getPFStatus,
  listCatalogAdmin,
  syncCatalog,
  updateCatalogGame,
} from "@/lib/playfivers.functions";
import { getLobbyProviders } from "@/lib/playfivers.functions";
import {
  Empty,
  ErrorBox,
  PageHeader,
  Pager,
  Panel,
  Segmented,
  Table,
  Td,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatBRL, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

type Cat = "all" | "slot" | "live" | "crash" | "table" | "other";
type St = "all" | "active" | "inactive" | "featured";
const CAT_LABEL: Record<string, string> = {
  slot: "Slot",
  live: "Ao vivo",
  crash: "Crash",
  table: "Mesa",
  other: "Outro",
};

export const Route = createFileRoute("/admin/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo de jogos | admin" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getPFStatus);
  const fetchList = useServerFn(listCatalogAdmin);
  const fetchProviders = useServerFn(getLobbyProviders);
  const sync = useServerFn(syncCatalog);
  const update = useServerFn(updateCatalogGame);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [provider, setProvider] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const [st, setSt] = useState<St>("all");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const status = useQuery({ queryKey: ["admin-pf-status"], queryFn: () => fetchStatus() });
  const providers = useQuery({ queryKey: ["lobby-providers"], queryFn: () => fetchProviders() });
  const list = useQuery({
    queryKey: ["admin-catalog", term, provider, cat, st, page],
    queryFn: () =>
      fetchList({
        data: {
          q: term || undefined,
          provider: provider || undefined,
          category: cat,
          status: st,
          page,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const syncM = useMutation({
    mutationFn: () => sync(),
    onSuccess: (r) => {
      toast.success(
        `${r.inserted} jogos novos, ${r.refreshed} atualizados, ${r.deactivated} retirados do lobby.`,
        {
          description: r.failed.length
            ? `Provedores que falharam: ${r.failed.join(", ")}`
            : undefined,
        },
      );
      qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      qc.invalidateQueries({ queryKey: ["lobby"] });
      qc.invalidateQueries({ queryKey: ["lobby-providers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: (v: {
      id: number;
      active?: boolean;
      featured?: boolean;
      sort_order?: number;
      category?: Exclude<Cat, "all">;
    }) => update({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      qc.invalidateQueries({ queryKey: ["lobby"] });
      qc.invalidateQueries({ queryKey: ["top-games"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = status.data;
  const officialWallets = s?.wallets
    ? Object.entries(s.wallets).filter(([k]) => /oficial/i.test(k))
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogo de jogos"
        description="Só jogos dos provedores oficiais entram. A sincronização traz jogos novos e atualiza nomes e capas; ordem, destaque, categoria e ativo ficam como você deixar."
        actions={
          <Button
            onClick={() => syncM.mutate()}
            disabled={syncM.isPending || !s?.configured}
            className="h-10 rounded-[10px] font-bold shadow-none"
          >
            {syncM.isPending ? (
              <>
                <Loader2 className="animate-spin" /> Sincronizando
              </>
            ) : (
              "Sincronizar com a PlayFivers"
            )}
          </Button>
        }
      />

      <Panel title="Integração PlayFivers">
        {!s ? (
          <div className="skeleton h-16 rounded-[8px]" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <ul className="space-y-2.5 text-[14px]">
              <Check
                ok={s.configured}
                good="Token e chave do agente configurados"
                bad="Falta PLAYFIVERS_AGENT_TOKEN e PLAYFIVERS_SECRET_KEY nos segredos do projeto"
              />
              <Check
                ok={s.agentCode}
                good="Código do agente configurado"
                bad="Falta PLAYFIVERS_AGENT_CODE (os webhooks de aposta são recusados sem ele)"
              />
              <Check
                ok={s.callbackToken}
                good="Token da URL de callback configurado"
                bad="Falta PLAYFIVERS_CALLBACK_TOKEN (24+ caracteres aleatórios)"
              />
              <Check
                ok={s.viaProxy}
                good="Chamadas saem pelo IP fixo do relay"
                bad="Sem relay de IP fixo: a PlayFivers pode recusar o IP do servidor"
                warn
              />
              {s.error && <Check ok={false} good="" bad={`A PlayFivers respondeu: ${s.error}`} />}
            </ul>
            <div className="space-y-3 text-[14px]">
              <div>
                <p className="text-[12.5px] text-muted-foreground">
                  URL de callback para colar no painel da PlayFivers
                </p>
                <p className="mt-1 break-all rounded-[8px] bg-background px-3 py-2 font-mono text-[12.5px]">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  /api/public/playfivers/SEU_PLAYFIVERS_CALLBACK_TOKEN
                </p>
              </div>
              {officialWallets.length > 0 && (
                <div>
                  <p className="text-[12.5px] text-muted-foreground">
                    Saldo das carteiras oficiais na PlayFivers
                  </p>
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                    {officialWallets.map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-2">
                        <span className="truncate text-muted-foreground">
                          {k.replace(/^OFICIAL\s*-\s*/i, "")}
                        </span>
                        <span className="num">{formatBRL(v)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block w-full sm:w-[300px]">
          <span className="sr-only">Buscar jogo</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="field-input h-11 pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome do jogo"
          />
        </label>
        <select
          className="field-input h-11 w-full sm:w-[240px]"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setPage(0);
          }}
          aria-label="Provedor"
        >
          <option value="">Todos os provedores</option>
          {(providers.data ?? []).map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.games})
            </option>
          ))}
        </select>
        <Segmented<Cat>
          value={cat}
          onChange={(v) => {
            setCat(v);
            setPage(0);
          }}
          options={[
            { id: "all", label: "Todas as categorias" },
            { id: "slot", label: "Slots" },
            { id: "crash", label: "Crash" },
            { id: "live", label: "Ao vivo" },
            { id: "table", label: "Mesas" },
          ]}
        />
        <Segmented<St>
          value={st}
          onChange={(v) => {
            setSt(v);
            setPage(0);
          }}
          options={[
            { id: "all", label: "Todos os jogos" },
            { id: "featured", label: "Destaques" },
            { id: "active", label: "No lobby" },
            { id: "inactive", label: "Fora do lobby" },
          ]}
        />
      </div>

      {list.error ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <Panel
          flush
          title={list.data ? `${list.data.total.toLocaleString("pt-BR")} jogos` : undefined}
        >
          <Table
            loading={list.isLoading}
            head={["", "Jogo", "Categoria", "Ordem", "Destaque", "No lobby", "Visto na sync"]}
            empty={
              list.data && !list.data.games.length ? (
                <Empty>
                  {list.data.total === 0 && !term && !provider
                    ? "O catálogo está vazio. Configure a PlayFivers e clique em Sincronizar."
                    : "Nenhum jogo com esses filtros."}
                </Empty>
              ) : null
            }
          >
            {list.data?.games.map((g) => (
              <tr key={g.id} className={cn(!g.active && "opacity-55")}>
                <Td>
                  {g.image_url ? (
                    <img
                      src={g.image_url}
                      alt=""
                      width={36}
                      height={48}
                      loading="lazy"
                      className="h-12 w-9 rounded-[6px] object-cover"
                    />
                  ) : (
                    <span className="block h-12 w-9 rounded-[6px] bg-surface-2" />
                  )}
                </Td>
                <Td>
                  <span className="block max-w-[260px] truncate font-medium">{g.name}</span>
                  <span className="text-[12px] text-muted-foreground">{g.provider}</span>
                </Td>
                <Td>
                  <select
                    className="h-9 rounded-[8px] border border-border bg-background px-2 text-[13px]"
                    value={g.category}
                    onChange={(e) =>
                      upd.mutate({ id: g.id, category: e.target.value as Exclude<Cat, "all"> })
                    }
                    aria-label={`Categoria de ${g.name}`}
                  >
                    {Object.entries(CAT_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <SortInput
                    value={g.sort_order}
                    onSave={(v) => upd.mutate({ id: g.id, sort_order: v })}
                  />
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => upd.mutate({ id: g.id, featured: !g.featured })}
                    aria-pressed={g.featured}
                    aria-label={g.featured ? `Tirar ${g.name} dos destaques` : `Destacar ${g.name}`}
                    className={cn(
                      "grid size-9 place-items-center rounded-[8px] border",
                      g.featured
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Star className={cn("size-4", g.featured && "fill-current")} />
                  </button>
                </Td>
                <Td>
                  <Switch
                    checked={g.active}
                    onCheckedChange={(v) => upd.mutate({ id: g.id, active: v })}
                    aria-label={`${g.name} no lobby`}
                  />
                </Td>
                <Td>
                  <span className="num text-[12.5px] text-muted-foreground">
                    {formatWhen(g.last_seen_at)}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
          {list.data && (
            <Pager
              page={page}
              pageSize={list.data.pageSize}
              total={list.data.total}
              onPage={setPage}
            />
          )}
        </Panel>
      )}
      <p className="text-[13px] text-muted-foreground">
        Ordem menor aparece primeiro. Destaques entram no Top 10 enquanto ainda não há rodadas
        suficientes para medir os mais jogados.
      </p>
    </div>
  );
}

function SortInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <input
      className="num h-9 w-20 rounded-[8px] border border-border bg-background px-2 text-[13px]"
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 6))}
      onBlur={() => {
        const n = Number(v);
        if (v !== "" && n !== value) onSave(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      aria-label="Ordem"
    />
  );
}

function Check({
  ok,
  good,
  bad,
  warn,
}: {
  ok: boolean;
  good: string;
  bad: string;
  warn?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-live" />
      ) : (
        <AlertTriangle
          className={cn("mt-0.5 size-[18px] shrink-0", warn ? "text-gold" : "text-destructive")}
        />
      )}
      <span>{ok ? good : bad}</span>
    </li>
  );
}
