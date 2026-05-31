import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/layout/site-shell";
import { listMyTransactions } from "@/lib/profile.functions";
import { ArrowDownToLine, ArrowUpFromLine, Trophy, Gift, Dices } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — PIXBET" }] }),
  component: Page,
});

const icons = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  bet: Dices,
  win: Trophy,
  bonus: Gift,
};

const statusColor: Record<string, string> = {
  completed: "text-[var(--success)]",
  pending: "text-yellow-500",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
};

function Page() {
  const fetch = useServerFn(listMyTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fetch() });

  return (
    <SiteShell>
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">📊 Histórico de Transações</h1>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando...</p>
          ) : !data?.length ? (
            <p className="p-10 text-center text-muted-foreground">Nenhuma transação ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3 hidden sm:table-cell">Descrição</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-right p-3">Status</th>
                  <th className="text-right p-3 hidden md:table-cell">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => {
                  const Ico = icons[t.type as keyof typeof icons] ?? Dices;
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="p-3"><div className="flex items-center gap-2"><Ico className="size-4 text-primary" /><span className="capitalize">{t.type}</span></div></td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{t.description}</td>
                      <td className="p-3 text-right font-bold">R$ {Number(t.amount).toFixed(2)}</td>
                      <td className={`p-3 text-right font-medium capitalize ${statusColor[t.status] ?? ""}`}>{t.status}</td>
                      <td className="p-3 text-right hidden md:table-cell text-muted-foreground text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
