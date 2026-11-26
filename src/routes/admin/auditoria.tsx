import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/lib/admin.functions";
import {
  Empty,
  ErrorBox,
  LoadMore,
  PageHeader,
  Panel,
  Segmented,
  Table,
  Td,
} from "@/components/admin/ui";
import { formatBRL, formatDateTime } from "@/lib/format";

type Filter =
  | ""
  | "wallet"
  | "withdrawal"
  | "deposit"
  | "kyc"
  | "user"
  | "settings"
  | "catalog"
  | "sports_bet"
  | "banner";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria | admin" }] }),
  component: Page,
});

const ACTION: Record<string, string> = {
  "wallet.adjust": "Ajustou saldo",
  "user.update": "Editou jogador",
  "user.freeze": "Suspendeu conta",
  "user.unfreeze": "Reativou conta",
  "user.delete": "Apagou conta",
  "withdrawal.approved": "Aprovou saque",
  "withdrawal.rejected": "Recusou saque",
  "deposit.approved": "Aprovou depósito na mão",
  "deposit.rejected": "Recusou depósito",
  "settings.update": "Mudou configurações",
  "catalog.sync": "Sincronizou catálogo",
  "catalog.update": "Editou jogo do catálogo",
  "sports_bet.settle": "Liquidou aposta na mão",
  "kyc.review": "Revisou documentos",
  "kyc.request": "Pediu documentos",
  "gateway.update": "Mudou credenciais do gateway",
  "banner.create": "Criou banner",
  "banner.update": "Editou banner",
  "banner.delete": "Apagou banner",
};

const KEY: Record<string, string> = {
  reason: "motivo",
  title: "título",
  active: "no ar",
  featured: "destaque",
  sort_order: "ordem",
  category: "categoria",
  is_frozen: "suspensa",
  freeze_reason: "motivo",
  full_name: "nome",
  phone: "telefone",
  birth_date: "nascimento",
  kyc_verified: "documentos ok",
  inserted: "novos",
  refreshed: "atualizados",
  deactivated: "retirados",
  real_money_enabled: "dinheiro real",
  maintenance_mode: "manutenção",
  casino_enabled: "cassino",
  sports_enabled: "esportes",
  signup_enabled: "cadastros",
  active_gateway: "gateway",
};
const label = (k: string) => KEY[k] ?? k.replace(/_/g, " ");

function describe(details: Record<string, unknown> | null): string {
  if (!details) return "";
  const out: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (v === null || v === undefined || k === "request_id") continue;
    if (["delta", "amount", "balance_after", "fee"].includes(k) && typeof v === "number")
      out.push(
        `${k === "balance_after" ? "saldo depois" : k === "fee" ? "taxa" : "valor"} ${formatBRL(v)}`,
      );
    else if (typeof v === "boolean") out.push(`${label(k)}: ${v ? "sim" : "não"}`);
    else if (Array.isArray(v)) out.push(`${label(k)}: ${v.join(", ")}`);
    else if (typeof v === "object") continue;
    else out.push(`${label(k)}: ${String(v)}`);
  }
  return out.join(", ");
}

function Page() {
  const [filter, setFilter] = useState<Filter>("");
  const fetchAudit = useServerFn(listAudit);
  const q = useInfiniteQuery({
    queryKey: ["admin-audit", filter],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchAudit({ data: { before: pageParam, action: filter || undefined } }),
    getNextPageParam: (last) => (last.length === 60 ? last[last.length - 1].id : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Auditoria"
        description="Tudo o que alguém do admin fez, com quem fez, quando e em qual jogador. O registro não pode ser editado."
      />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "", label: "Tudo" },
          { id: "wallet", label: "Saldo" },
          { id: "withdrawal", label: "Saques" },
          { id: "deposit", label: "Depósitos" },
          { id: "kyc", label: "Documentos" },
          { id: "user", label: "Jogadores" },
          { id: "sports_bet", label: "Esportes" },
          { id: "catalog", label: "Catálogo" },
          { id: "banner", label: "Banners" },
          { id: "settings", label: "Configurações" },
        ]}
      />
      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Panel flush>
          <Table
            loading={q.isLoading}
            head={["Quando", "Quem", "Ação", "Jogador", "Detalhes"]}
            empty={!q.isLoading && !rows.length ? <Empty>Nenhuma ação registrada.</Empty> : null}
          >
            {rows.map((a) => (
              <tr key={a.id}>
                <Td>
                  <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                    {formatDateTime(a.created_at)}
                  </span>
                </Td>
                <Td>
                  <span className="font-medium">{a.adminName}</span>
                </Td>
                <Td>{ACTION[a.action] ?? a.action}</Td>
                <Td>
                  {a.target_user ? (
                    <Link
                      to="/admin/usuarios/$id"
                      params={{ id: a.target_user }}
                      className="font-medium hover:text-primary"
                    >
                      {a.target?.full_name || a.target?.username || a.target_user.slice(0, 8)}
                    </Link>
                  ) : (
                    "–"
                  )}
                </Td>
                <Td>
                  <span className="block max-w-[420px] text-[13px] text-muted-foreground">
                    {describe(a.details as Record<string, unknown>)}
                  </span>
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
