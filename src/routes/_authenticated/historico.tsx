import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { listMyTransactions } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { ArrowDownToLine, ArrowUpFromLine, Dices, ShieldAlert } from "lucide-react";
import { KycDialog } from "@/components/auth/kyc-dialog";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — SANTOSBET" }] }),
  component: Page,
});

const tabs = [
  { k: "all", label: "Todos" },
  { k: "deposit", label: "Depósitos" },
  { k: "withdrawal", label: "Saques" },
] as const;

function statusLabel(t: any): { label: string; cls: string } {
  // KYC takes priority on withdrawals
  if (t.type === "withdrawal" && t.kyc_required) {
    const sub = t.kyc_submission;
    if (!sub || sub.status === "rejected") {
      return { label: "Verificação Necessária", cls: "bg-orange-500/20 text-orange-400" };
    }
    if (sub.status === "pending") return { label: "Em análise", cls: "bg-blue-500/20 text-blue-400" };
  }
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-500" },
    approved: { label: "Aprovado", cls: "bg-green-500/20 text-green-500" },
    rejected: { label: "Rejeitado", cls: "bg-red-500/20 text-red-500" },
    completed: { label: "Concluído", cls: "bg-green-500/20 text-green-500" },
    failed: { label: "Falhou", cls: "bg-red-500/20 text-red-500" },
  };
  return map[t.status] ?? { label: t.status, cls: "bg-muted text-muted-foreground" };
}

function Page() {
  const { user } = useAuth();
  const fn = useServerFn(listMyTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fn(), enabled: !!user });
  const [tab, setTab] = useState<(typeof tabs)[number]["k"]>("all");
  const [kycTx, setKycTx] = useState<string | null>(null);
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
              {filtered.map((t: any) => {
                const Ico = t.type === "deposit" ? ArrowDownToLine : t.type === "withdrawal" ? ArrowUpFromLine : Dices;
                const positive = t.type === "deposit";
                const st = statusLabel(t);
                const needsKyc = t.type === "withdrawal" && t.kyc_required &&
                  (!t.kyc_submission || t.kyc_submission.status === "rejected");
                return (
                  <li key={t.id} className="p-4 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${positive ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
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
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${st.cls}`}>{st.label}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                    {needsKyc && (
                      <div className="mt-3 ml-13 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <ShieldAlert className="size-4 text-orange-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-orange-200 leading-snug">
                            {t.kyc_submission?.status === "rejected"
                              ? <>Verificação anterior recusada{t.kyc_submission.rejection_reason ? `: ${t.kyc_submission.rejection_reason}` : ""}. Envie novamente.</>
                              : "Para liberar este saque, envie seus documentos de identidade."}
                          </p>
                        </div>
                        <button
                          onClick={() => setKycTx(t.id)}
                          className="h-9 px-4 rounded-md bg-orange-500 text-white font-bold text-xs uppercase hover:brightness-110 whitespace-nowrap"
                        >
                          Verificar agora
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {kycTx && (
        <KycDialog transactionId={kycTx} open onClose={() => setKycTx(null)} />
      )}
    </SiteShell>
  );
}
