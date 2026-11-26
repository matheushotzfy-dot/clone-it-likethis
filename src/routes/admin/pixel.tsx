import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Search } from "lucide-react";
import { listDepositorsPixel } from "@/lib/admin.functions";
import {
  Empty,
  ErrorBox,
  Money,
  PageHeader,
  Panel,
  PlayerLink,
  Stat,
  Table,
  Td,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/pixel")({
  head: () => ({ meta: [{ title: "Públicos para anúncio | admin" }] }),
  component: Page,
});

/** Telefone no formato que o Meta aceita na lista de clientes: só dígitos, com 55 na frente. */
function metaPhone(phone: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

function splitName(full: string | null) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { fn: parts[0] ?? "", ln: parts.length > 1 ? parts[parts.length - 1] : "" };
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Page() {
  const fetchRows = useServerFn(listDepositorsPixel);
  const q = useQuery({ queryKey: ["admin-pixel"], queryFn: () => fetchRows() });
  const [term, setTerm] = useState("");
  const [minDeposit, setMinDeposit] = useState(0);

  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (q.data ?? []).filter(
      (r) =>
        r.deposits >= minDeposit &&
        (!t ||
          [r.full_name, r.email, r.utm_campaign, r.utm_source].some((v) =>
            (v ?? "").toLowerCase().includes(t),
          )),
    );
  }, [q.data, term, minDeposit]);
  const total = rows.reduce((s, r) => s + r.deposits, 0);
  const campaigns = useMemo(() => {
    const m = new Map<string, { players: number; deposits: number }>();
    for (const r of q.data ?? []) {
      const k = r.utm_campaign || r.utm_source || "Sem origem";
      const cur = m.get(k) ?? { players: 0, deposits: 0 };
      m.set(k, { players: cur.players + 1, deposits: cur.deposits + r.deposits });
    }
    return [...m.entries()].sort((a, b) => b[1].deposits - a[1].deposits).slice(0, 8);
  }, [q.data]);

  function exportCsv() {
    const head = ["email", "phone", "fn", "ln", "country", "value"];
    const lines = rows.map((r) => {
      const { fn, ln } = splitName(r.full_name);
      return [
        r.email,
        metaPhone(r.phone),
        fn.toLowerCase(),
        ln.toLowerCase(),
        "br",
        r.deposits.toFixed(2),
      ]
        .map(csvCell)
        .join(",");
    });
    const blob = new Blob([[head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `publico-depositantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Públicos para anúncio"
        description="Quem já depositou, com o valor depositado, no formato da lista de clientes do Meta (com valor). O CSV não leva CPF nem documento."
        actions={
          <Button
            onClick={exportCsv}
            disabled={!rows.length}
            className="h-10 gap-2 rounded-[10px] font-bold shadow-none"
          >
            <Download className="size-4" /> Baixar CSV para o Meta
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Depositantes na lista" value={rows.length.toLocaleString("pt-BR")} />
        <Stat label="Total depositado por eles" value={formatBRL(total)} />
        <Stat
          label="Média por depositante"
          value={formatBRL(rows.length ? total / rows.length : 0)}
        />
      </div>

      {campaigns.length > 0 && (
        <Panel title="De onde vieram">
          <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {campaigns.map(([k, v]) => (
              <li
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 text-[14px]"
              >
                <span className="min-w-0 truncate">{k}</span>
                <span className="num shrink-0 text-muted-foreground">
                  {v.players} · <span className="text-foreground">{formatBRL(v.deposits)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block sm:w-[320px]">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="field-input h-11 pl-10"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nome, e-mail ou campanha"
          />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-muted-foreground">
          Depositou pelo menos
          <select
            className="field-input h-11 w-[130px]"
            value={minDeposit}
            onChange={(e) => setMinDeposit(Number(e.target.value))}
          >
            {[0, 50, 100, 300, 500, 1000, 5000].map((v) => (
              <option key={v} value={v}>
                {v === 0 ? "Qualquer valor" : formatBRL(v)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Panel flush>
          <Table
            loading={q.isLoading}
            head={["Jogador", "E-mail", "Telefone", "Depositou", "Origem", "Cadastro"]}
            empty={!q.isLoading && !rows.length ? <Empty>Ninguém depositou ainda.</Empty> : null}
          >
            {rows.slice(0, 300).map((r) => (
              <tr key={r.user_id}>
                <Td>
                  <PlayerLink
                    id={r.user_id!}
                    user={{ username: null, full_name: r.full_name, cpf: r.cpf }}
                  />
                </Td>
                <Td>
                  <span className="block max-w-[220px] truncate text-[13.5px]">
                    {r.email || "–"}
                  </span>
                </Td>
                <Td>
                  <span className="num text-[13.5px]">{r.phone || "–"}</span>
                </Td>
                <Td>
                  <Money value={r.deposits} />
                </Td>
                <Td>
                  <span className="block max-w-[200px] truncate text-[13px] text-muted-foreground">
                    {r.utm_campaign || r.utm_source || "Sem origem"}
                  </span>
                </Td>
                <Td>
                  <span className="num text-[13px] text-muted-foreground">
                    {r.created_at ? formatDate(r.created_at) : "–"}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
          {rows.length > 300 && (
            <p className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
              Mostrando os 300 maiores. O CSV leva todos os {rows.length.toLocaleString("pt-BR")}.
            </p>
          )}
        </Panel>
      )}
      <p className="max-w-3xl text-[13px] text-muted-foreground">
        Antes de subir a lista no Meta, a política de privacidade do site precisa dizer que os dados
        de cadastro podem ser usados para anúncios. O Meta criptografa a lista no envio.
      </p>
    </div>
  );
}
