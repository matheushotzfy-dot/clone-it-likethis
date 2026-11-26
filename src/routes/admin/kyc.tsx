import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listPendingKyc, reviewKyc } from "@/lib/kyc.functions";
import {
  Empty,
  ErrorBox,
  Money,
  PageHeader,
  Panel,
  Segmented,
  StatusPill,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ageOnClient, formatDate, formatDateTime } from "@/lib/format";
import { maskCPF } from "@/lib/validations";

type St = "pending" | "approved" | "rejected" | "all";
type Sub = Awaited<ReturnType<typeof listPendingKyc>>[number];

export const Route = createFileRoute("/admin/kyc")({
  head: () => ({ meta: [{ title: "Documentos | admin" }] }),
  component: Page,
});

const REASONS = [
  "Foto ilegível ou cortada",
  "Documento não bate com o CPF do cadastro",
  "Selfie não mostra o rosto junto com o documento",
  "Comprovante de residência com mais de 90 dias",
];

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingKyc);
  const reviewFn = useServerFn(reviewKyc);
  const [st, setSt] = useState<St>("pending");
  const [rejecting, setRejecting] = useState<Sub | null>(null);
  const q = useQuery({
    queryKey: ["admin-kyc", st],
    queryFn: () => listFn({ data: { status: st } }),
  });
  const review = useMutation({
    mutationFn: (v: { submissionId: string; approve: boolean; reason?: string }) =>
      reviewFn({ data: v }),
    onSuccess: (_, v) => {
      toast.success(
        v.approve
          ? "Documentos aprovados. O saque voltou para a fila de saques."
          : "Documentos recusados. O jogador vê o motivo e pode mandar de novo.",
      );
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documentos"
        description="Confira se o documento é da mesma pessoa do cadastro (nome, CPF e data de nascimento) antes de liberar o saque. Os links das fotos valem por 30 minutos."
      />
      <Segmented<St>
        value={st}
        onChange={setSt}
        options={[
          { id: "pending", label: "Para revisar" },
          { id: "approved", label: "Aprovados" },
          { id: "rejected", label: "Recusados" },
          { id: "all", label: "Todos" },
        ]}
      />

      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-80 rounded-[12px]" />
          ))}
        </div>
      ) : !q.data?.length ? (
        <Panel>
          <Empty>
            {st === "pending" ? "Nenhum documento esperando revisão." : "Nada por aqui."}
          </Empty>
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {q.data.map((s) => {
            const p = s.profile;
            const age = p?.birth_date ? ageOnClient(p.birth_date) : null;
            return (
              <Panel
                key={s.id}
                title={
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: s.user_id }}
                    search={{}}
                    className="hover:text-primary"
                  >
                    {p?.full_name || p?.username || s.user_id.slice(0, 8)}
                  </Link>
                }
                actions={
                  <StatusPill
                    status={s.status}
                    label={s.status === "pending" ? "Para revisar" : undefined}
                  />
                }
              >
                <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13.5px] sm:grid-cols-4">
                  <Item label="CPF" value={p?.cpf ? maskCPF(p.cpf) : "–"} />
                  <Item
                    label="Nascimento"
                    value={
                      p?.birth_date
                        ? `${formatDate(p.birth_date)}${age !== null ? ` (${age} anos)` : ""}`
                        : "–"
                    }
                  />
                  <Item label="Documento" value={s.document_type === "cnh" ? "CNH" : "RG"} />
                  <Item
                    label="Saque"
                    value={s.withdrawal ? <Money value={s.withdrawal.amount} /> : "–"}
                  />
                </dl>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Doc label="Frente" url={s.id_front_signed} />
                  <Doc
                    label="Verso"
                    url={s.id_back_signed}
                    missing={s.document_type === "cnh" ? "CNH não tem verso" : "Não enviado"}
                  />
                  <Doc label="Selfie com documento" url={s.selfie_signed} />
                  <Doc label="Comprovante" url={s.residence_signed} />
                </div>
                <p className="mt-3 text-[12.5px] text-muted-foreground">
                  Enviado em {formatDateTime(s.created_at)}
                  {s.reviewed_at ? `, revisado em ${formatDateTime(s.reviewed_at)}` : ""}
                </p>
                {s.status === "rejected" && s.rejection_reason && (
                  <p className="mt-2 rounded-[8px] bg-destructive/10 px-3 py-2 text-[13.5px]">
                    Motivo: {s.rejection_reason}
                  </p>
                )}
                {s.status === "pending" && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      className="h-10 rounded-[10px]"
                      disabled={review.isPending}
                      onClick={() => setRejecting(s)}
                    >
                      Recusar
                    </Button>
                    <Button
                      className="h-10 rounded-[10px] font-bold shadow-none"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ submissionId: s.id, approve: true })}
                    >
                      {review.isPending &&
                      review.variables?.submissionId === s.id &&
                      review.variables.approve ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "Aprovar documentos"
                      )}
                    </Button>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <RejectDialog
        sub={rejecting}
        pending={review.isPending}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) =>
          rejecting && review.mutate({ submissionId: rejecting.id, approve: false, reason })
        }
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}

function Doc({
  label,
  url,
  missing = "Indisponível",
}: {
  label: string;
  url: string | null;
  missing?: string;
}) {
  if (!url)
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-[10px] border border-dashed border-border p-2 text-center text-[12.5px] text-muted-foreground">
        {label}
        <br />
        {missing}
      </div>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group relative block aspect-[4/3] overflow-hidden rounded-[10px] border border-border bg-background"
    >
      <img
        src={url}
        alt={label}
        loading="lazy"
        className="size-full object-cover transition-opacity group-hover:opacity-80"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="absolute inset-x-0 bottom-0 bg-background/85 px-2 py-1 text-[12px] font-semibold">
        {label}
      </span>
    </a>
  );
}

function RejectDialog({
  sub,
  pending,
  onClose,
  onConfirm,
}: {
  sub: Sub | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={!!sub}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setReason("");
        }
      }}
    >
      <DialogContent className="rounded-[16px] border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[24px]">Recusar documentos</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] text-muted-foreground">
          O jogador vê esse motivo e pode mandar os documentos de novo. O saque continua parado até
          lá.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className="chip"
              data-active={reason === r || undefined}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          className="field-input min-h-[88px] py-2.5"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          placeholder="Motivo"
          aria-label="Motivo da recusa"
        />
        <DialogFooter>
          <Button variant="outline" className="rounded-[10px]" onClick={onClose}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            className="rounded-[10px]"
            disabled={pending || reason.trim().length < 3}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? <Loader2 className="animate-spin" /> : "Recusar documentos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
