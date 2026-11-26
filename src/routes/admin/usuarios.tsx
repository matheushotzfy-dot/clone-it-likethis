import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { listPlayers } from "@/lib/admin.functions";
import {
  Empty,
  ErrorBox,
  Money,
  PageHeader,
  Pager,
  Panel,
  Segmented,
  StatusPill,
  Table,
  Td,
} from "@/components/admin/ui";
import { formatBRL, formatWhen } from "@/lib/format";
import { maskCPF } from "@/lib/validations";

type Filter = "all" | "balance" | "depositors" | "frozen" | "new";
type Sort = "recent" | "balance" | "deposits" | "ggr" | "last_bet";

export const Route = createFileRoute("/admin/usuarios")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string; filtro?: Filter; ordem?: Sort; pagina?: number } => ({
    q: typeof s.q === "string" ? s.q : undefined,
    filtro: (["balance", "depositors", "frozen", "new"].includes(String(s.filtro))
      ? s.filtro
      : undefined) as Filter | undefined,
    ordem: (["balance", "deposits", "ggr", "last_bet"].includes(String(s.ordem))
      ? s.ordem
      : undefined) as Sort | undefined,
    pagina: typeof s.pagina === "number" ? s.pagina : undefined,
  }),
  head: () => ({ meta: [{ title: "Jogadores | admin" }] }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/usuarios" });
  const [term, setTerm] = useState(search.q ?? "");
  const fetchPlayers = useServerFn(listPlayers);
  const filter = search.filtro ?? "all";
  const sort = search.ordem ?? "recent";
  const page = search.pagina ?? 0;

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== term.trim())
        navigate({
          search: (s) => ({ ...s, q: term.trim() || undefined, pagina: undefined }),
          replace: true,
        });
    }, 400);
    return () => clearTimeout(t);
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = useQuery({
    queryKey: ["admin-players", search.q, filter, sort, page],
    queryFn: () => fetchPlayers({ data: { q: search.q, filter, sort, page } }),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader
        title="Jogadores"
        description="Busque por nome, usuário, CPF, celular, e-mail ou id. Clique no jogador para ver tudo o que ele fez."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-[360px]">
          <span className="sr-only">Buscar jogador</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nome, CPF, e-mail, celular…"
            className="field-input h-11 pl-10"
          />
        </label>
        <Segmented<Filter>
          value={filter}
          onChange={(v) =>
            navigate({
              search: (s) => ({ ...s, filtro: v === "all" ? undefined : v, pagina: undefined }),
              replace: true,
            })
          }
          options={[
            { id: "all", label: "Todos" },
            { id: "balance", label: "Com saldo" },
            { id: "depositors", label: "Depositantes" },
            { id: "new", label: "Novos (7 dias)" },
            { id: "frozen", label: "Suspensos" },
          ]}
        />
        <label className="lg:ml-auto">
          <span className="sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={(e) =>
              navigate({
                search: (s) => ({
                  ...s,
                  ordem: e.target.value === "recent" ? undefined : (e.target.value as Sort),
                  pagina: undefined,
                }),
                replace: true,
              })
            }
            className="field-input h-11 lg:w-[220px]"
          >
            <option value="recent">Mais recentes</option>
            <option value="balance">Maior saldo</option>
            <option value="deposits">Mais depositou</option>
            <option value="ggr">Maior GGR</option>
            <option value="last_bet">Apostou por último</option>
          </select>
        </label>
      </div>

      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Panel
          flush
          title={q.data ? `${q.data.total.toLocaleString("pt-BR")} jogadores` : "Jogadores"}
        >
          <Table
            loading={q.isLoading}
            head={[
              "Jogador",
              "Contato",
              "Saldo",
              "Depositado",
              "Sacado",
              "GGR",
              "Última aposta",
              "Situação",
            ]}
            rightCols={[2, 3, 4, 5]}
            empty={
              q.data && q.data.players.length === 0 ? (
                <Empty>Nenhum jogador com esses filtros.</Empty>
              ) : null
            }
          >
            {q.data?.players.map((p) => (
              <tr key={p.user_id} className="hover:bg-surface-2/40">
                <Td>
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: p.user_id! }}
                    className="group flex max-w-[280px] items-center gap-3"
                  >
                    <Avatar
                      name={p.full_name || p.username || ""}
                      online={isOnline(p.last_seen_at)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold group-hover:text-primary">
                        {p.full_name || p.username}
                      </span>
                      <span className="num block truncate text-[12.5px] text-muted-foreground">
                        {p.cpf ? maskCPF(p.cpf) : "sem CPF"}, desde {formatWhen(p.created_at)}
                      </span>
                      {(p.utm_campaign || p.utm_source) && (
                        <span className="mt-0.5 inline-block max-w-full truncate rounded-[5px] bg-surface-2 px-1.5 py-px text-[11px] text-muted-foreground">
                          {p.utm_campaign || p.utm_source}
                        </span>
                      )}
                    </span>
                  </Link>
                </Td>
                <Td>
                  <span className="block max-w-[200px] truncate text-[13px]">{p.email}</span>
                  <span className="num block text-[12.5px] text-muted-foreground">{p.phone}</span>
                </Td>
                <Td right>
                  <Money value={p.balance} className="font-semibold" />
                </Td>
                <Td right>
                  <Money value={p.deposits} />
                </Td>
                <Td right>
                  <Money value={p.withdrawn} />
                  {p.withdraw_pending > 0 && (
                    <span className="num block whitespace-nowrap text-[12px] text-gold">
                      {formatBRL(p.withdraw_pending)} pendente
                    </span>
                  )}
                </Td>
                <Td right>
                  <Money value={p.ggr} />
                </Td>
                <Td>
                  <span className="block text-[13px] text-muted-foreground">
                    {p.last_bet_at ? formatWhen(p.last_bet_at) : "nunca"}
                  </span>
                  {isOnline(p.last_seen_at) && (
                    <span className="text-[12px] font-semibold text-live">online agora</span>
                  )}
                </Td>
                <Td>
                  <StatusPill status={p.is_frozen ? "frozen" : "active"} />
                </Td>
              </tr>
            ))}
          </Table>
          {q.data && (
            <Pager
              page={page}
              pageSize={q.data.pageSize}
              total={q.data.total}
              onPage={(pg) => navigate({ search: (s) => ({ ...s, pagina: pg || undefined }) })}
            />
          )}
        </Panel>
      )}
    </div>
  );
}

const isOnline = (seen: string | null) =>
  !!seen && Date.now() - new Date(seen).getTime() < 15 * 60_000;

function Avatar({ name, online }: { name: string; online: boolean }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "·";
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 font-display text-[14px] font-bold text-primary">
      {initials}
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-live"
          aria-label="Online agora"
        />
      )}
    </span>
  );
}
