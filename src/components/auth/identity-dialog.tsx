import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Camera, FileCheck, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyIdentity, submitIdentity } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AuthSheet } from "./auth-sheet";
import { useAuthDialog } from "./auth-dialog-context";

type DocType = "rg" | "cin" | "cnh" | "passaporte";
type Slot = "front" | "back" | "selfie";

const DOCS: { id: DocType; label: string; back: boolean }[] = [
  { id: "cin", label: "Nova identidade (CIN)", back: true },
  { id: "rg", label: "RG", back: true },
  { id: "cnh", label: "CNH", back: false },
  { id: "passaporte", label: "Passaporte", back: false },
];

const SLOT_META: Record<Slot, { title: string; help: string; icon: typeof FileText }> = {
  front: {
    title: "Frente do documento",
    help: "Foto inteira, com os dados legíveis",
    icon: FileText,
  },
  back: { title: "Verso do documento", help: "O lado com o número e a data", icon: FileText },
  selfie: {
    title: "Selfie segurando o documento",
    help: "Rosto e documento juntos, com boa luz e sem óculos escuros",
    icon: Camera,
  },
};

export function useIdentity() {
  const { user } = useAuth();
  const fetchIdentity = useServerFn(getMyIdentity);
  return useQuery({
    queryKey: ["my-identity"],
    queryFn: () => fetchIdentity(),
    enabled: !!user,
    staleTime: 20_000,
  });
}

/**
 * Verificação de identidade (Portaria 1.231, art. 31): documento com foto e selfie.
 * Sem ela não dá para depositar nem apostar.
 */
export function IdentityDialog() {
  const { current, close } = useAuthDialog();
  const { user } = useAuth();
  const identity = useIdentity();
  const submit = useServerFn(submitIdentity);
  const qc = useQueryClient();
  const [docType, setDocType] = useState<DocType>("cin");
  const [paths, setPaths] = useState<Partial<Record<Slot, string>>>({});
  const [uploading, setUploading] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  const doc = DOCS.find((d) => d.id === docType)!;
  const slots: Slot[] = doc.back ? ["front", "back", "selfie"] : ["front", "selfie"];
  const status = identity.data?.status ?? "none";

  async function upload(slot: Slot, file: File) {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Arquivo maior que 8 MB. Tire outra foto.");
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.type) && file.type !== "application/pdf")
      return toast.error("Envie uma foto (JPG ou PNG) ou um PDF.");
    setUploading(slot);
    const ext =
      (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/identity/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });
    setUploading(null);
    if (error) return toast.error("Não foi possível enviar a foto. Tente de novo.");
    setPaths((p) => ({ ...p, [slot]: path }));
  }

  async function send() {
    if (slots.some((s) => !paths[s])) return toast.error("Envie todas as fotos pedidas.");
    setBusy(true);
    try {
      await submit({
        data: {
          document_type: docType,
          id_front_path: paths.front!,
          id_back_path: doc.back ? paths.back! : null,
          selfie_path: paths.selfie!,
        },
      });
      toast.success("Documentos enviados. Avisamos aqui assim que a análise terminar.");
      setPaths({});
      for (const k of ["my-identity", "my-profile"]) qc.invalidateQueries({ queryKey: [k] });
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSheet
      open={current === "identity" && !!user}
      onOpenChange={(o) => !o && close()}
      title="Verificar identidade"
      width={480}
      description="A lei exige conferir quem é o titular antes do primeiro depósito ou aposta. As fotos ficam guardadas com acesso restrito e servem só para essa verificação."
    >
      {status === "verified" ? (
        <div className="space-y-4">
          <p className="flex items-start gap-3 rounded-[12px] border border-live/50 bg-live/10 p-4 text-[14.5px]">
            <BadgeCheck className="mt-0.5 size-5 shrink-0 text-live" />
            Sua identidade está verificada. Depósitos e apostas estão liberados.
          </p>
          <button
            type="button"
            onClick={close}
            className="h-11 w-full rounded-[10px] border border-border font-semibold"
          >
            Fechar
          </button>
        </div>
      ) : status === "pending" ? (
        <div className="space-y-4">
          <p className="rounded-[12px] border border-border bg-surface p-4 text-[14.5px] leading-relaxed">
            Recebemos seus documentos e eles estão em análise. Você pode continuar navegando; os
            depósitos e as apostas são liberados assim que a análise for aprovada.
          </p>
          <button
            type="button"
            onClick={close}
            className="h-11 w-full rounded-[10px] border border-border font-semibold"
          >
            Entendi
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {status === "rejected" && (
            <p
              role="alert"
              className="rounded-[10px] border border-destructive/40 bg-destructive/10 p-3 text-[13.5px]"
            >
              <strong className="font-semibold">Os documentos anteriores foram recusados.</strong>{" "}
              {identity.data?.rejectionReason ?? "Envie fotos mais nítidas."}
            </p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold">Documento com foto</span>
            <select
              className="field-input"
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value as DocType);
                setPaths((p) => ({ selfie: p.selfie }));
              }}
            >
              {DOCS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <ul className="space-y-2.5">
            {slots.map((slot) => {
              const meta = SLOT_META[slot];
              const Icon = meta.icon;
              const done = !!paths[slot];
              const isUp = uploading === slot;
              return (
                <li key={slot}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed p-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
                      done ? "border-live/60 bg-live/5" : "border-border hover:border-primary/60",
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture={slot === "selfie" ? "user" : undefined}
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void upload(slot, f);
                        e.target.value = "";
                      }}
                    />
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-[10px]",
                        done ? "bg-live text-background" : "bg-surface-2 text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <FileCheck className="size-5" />
                      ) : isUp ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold">{meta.title}</span>
                      <span className="block text-[12.5px] text-muted-foreground">
                        {done ? "Enviado. Toque para trocar." : meta.help}
                      </span>
                    </span>
                    {!done && !isUp && <Upload className="size-4 shrink-0 text-muted-foreground" />}
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={send}
            disabled={busy || !!uploading}
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-[16px] font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : "Enviar para análise"}
          </button>
          <p className="text-center text-[12.5px] text-muted-foreground">
            Fotos de até 8 MB, em JPG, PNG ou PDF. O nome e o CPF precisam ser os do cadastro.
          </p>
        </div>
      )}
    </AuthSheet>
  );
}
