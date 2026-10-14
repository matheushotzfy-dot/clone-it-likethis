import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPendingKyc, reviewKyc } from "@/lib/kyc.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, FileText, Home, IdCard, ShieldCheck, UserRound, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/kyc")({
  head: () => ({ meta: pageMeta('Verificação de documentos — apostamaxy', 'Verificação de documentos da apostamaxy. Área de gestão autorizada.') }), component: Page });

function Page() {
  const listFn = useServerFn(listPendingKyc);
  const reviewFn = useServerFn(reviewKyc);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-kyc"], queryFn: () => listFn(), staleTime: 10_000, refetchOnWindowFocus: false });
  const mut = useMutation({
    mutationFn: (vars: { submissionId: string; approve: boolean; reason?: string }) => reviewFn({ data: vars }),
    onSuccess: (_, vars) => { toast.success(vars.approve ? "KYC aprovado" : "KYC recusado"); qc.invalidateQueries({ queryKey: ["admin-kyc"] }); qc.invalidateQueries({ queryKey: ["admin-kpi"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary"><ShieldCheck className="size-4" /> Verificação de documentos</div>
          <h1 className="text-2xl md:text-3xl font-black">KYC</h1>
          <p className="text-sm text-muted-foreground">Analise os documentos enviados pelos usuários para liberar saques.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>Atualizar</Button>
      </div>

      {isLoading && <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-card" />)}</div>}
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">Erro ao carregar KYC: {(error as Error).message}</div>}
      {!isLoading && !error && (data ?? []).length === 0 && <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-3 size-10 opacity-40" />Nenhum documento pendente.</div>}

      <div className="grid gap-4 xl:grid-cols-2">
        {(data ?? []).map((s: any) => (
          <section key={s.id} className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-lg shadow-background/20">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-black"><UserRound className="size-4 text-primary" /> {s.profile?.full_name || s.profile?.username || s.user_id.slice(0, 8)}</div>
                <div className="mt-1 text-xs text-muted-foreground">CPF {s.profile?.cpf ?? "—"} · {new Date(s.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">{s.document_type}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DocLink icon={IdCard} label="Documento frente" url={s.id_front_signed} />
              <DocLink icon={IdCard} label="Documento verso" url={s.id_back_signed} optional />
              <DocLink icon={Home} label="Residência" url={s.residence_signed} />
              <DocLink icon={FileText} label="Selfie" url={s.selfie_signed} />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={mut.isPending} onClick={() => {
                const reason = prompt("Motivo da recusa", "Documentos inválidos ou ilegíveis") || "Documentos inválidos";
                mut.mutate({ submissionId: s.id, approve: false, reason });
              }}><XCircle className="size-4" /> Recusar</Button>
              <Button disabled={mut.isPending} onClick={() => mut.mutate({ submissionId: s.id, approve: true })}><CheckCircle2 className="size-4" /> Aprovar KYC</Button>
              <Button asChild variant="secondary"><Link to="/admin/usuarios/$id" params={{ id: s.user_id }}>Ver usuário</Link></Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DocLink({ icon: Icon, label, url, optional }: { icon: any; label: string; url?: string | null; optional?: boolean }) {
  if (!url) return <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">{optional ? `${label}: não enviado` : `${label}: indisponível`}</div>;
  return <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm font-bold hover:border-primary hover:text-primary"><Icon className="size-4" /> {label}</a>;
}