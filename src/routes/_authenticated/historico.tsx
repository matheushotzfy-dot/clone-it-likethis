import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { listMyTransactions } from "@/lib/profile.functions";
import { ArrowDownToLine, ArrowUpFromLine, Dices } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — PIXBET" }] }),
  component: Page,
});

const tabs = [
  { k: "all", label: "Todos" },
  { k: "deposit", label: "Depósitos" },
  { k: "withdrawal", label: "Saques" },
] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500",
    completed: "bg-green-500/20 text-green-500",
    failed: "bg-red-500/20 text-red-500",
  };
  return `px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[s] ?? "bg-muted text-muted-foreground"}`;
}

function Page() {
  const fn = useServerFn(listMyTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fn() });
  const [tab, setTab] = useState<(typeof tabs)[number]["k"]>("all");
  const filtered = (data ?? []).filter(t => tab === "all" ? true : t.type === tab);

  return (
    <SiteShell>
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 space-y-5">
        <h1 className="text-2xl font-bold">Histórico de Transações</h1>

        <div className="flex gap-1 bg-surface rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 h-9 rounded-md text-xs font-bold uppercase ${tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Dices className="size-12 mx-auto opacity-30 mb-2" />
              <p>Nenhuma transação ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((t) => {
                const Ico = t.type === "deposit" ? ArrowDownToLine : t.type === "withdrawal" ? ArrowUpFromLine : Dices;
                const positive = t.type === "deposit";
                return (
                  <li key={t.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                    <div className={`size-10 rounded-full flex items-center justify-center ${positive ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                      <Ico className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold capitalize text-sm">{t.type === "deposit" ? "Depósito" : t.type === "withdrawal" ? "Saque" : t.type}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black ${positive ? "text-green-500" : "text-red-500"}`}>
                        {positive ? "+" : "-"} R$ {Number(t.amount).toFixed(2).replace(".", ",")}
                      </div>
                      <div className="flex gap-2 justify-end items-center mt-0.5">
                        <span className={statusBadge(t.status)}>{t.status}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
