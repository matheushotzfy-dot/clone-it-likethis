import { useState } from "react";
import { AuthSheet } from "./auth-sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitKyc } from "@/lib/kyc.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload, FileCheck, Camera, FileText, Home, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  transactionId: string;
  open: boolean;
  onClose: () => void;
}

type DocType = "rg" | "cnh";
type Slot = "id_front" | "id_back" | "residence" | "selfie";

const SLOT_META: Record<Slot, { title: string; help: string; icon: typeof FileText }> = {
  id_front: {
    title: "Frente do documento",
    help: "RG ou CNH, com todos os dados legíveis",
    icon: FileText,
  },
  id_back: { title: "Verso do documento", help: "Só para RG", icon: FileText },
  residence: {
    title: "Comprovante de endereço",
    help: "Conta de luz, água ou internet dos últimos 90 dias",
    icon: Home,
  },
  selfie: {
    title: "Selfie com o documento",
    help: "Você segurando o documento ao lado do rosto",
    icon: Camera,
  },
};

export function KycDialog({ transactionId, open, onClose }: Props) {
  const { user } = useAuth();
  const submitFn = useServerFn(submitKyc);
  const qc = useQueryClient();
  const [docType, setDocType] = useState<DocType>("rg");
  const [paths, setPaths] = useState<Partial<Record<Slot, string>>>({});
  const [uploading, setUploading] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFile(slot: Slot, file: File) {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 8MB)");
      return;
    }
    if (
      !/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.type) &&
      file.type !== "application/pdf"
    ) {
      toast.error("Envie uma imagem (JPG, PNG) ou PDF");
      return;
    }
    setUploading(slot);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${transactionId}/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });
    setUploading(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPaths((p) => ({ ...p, [slot]: path }));
  }

  async function handleSubmit() {
    if (!paths.id_front || !paths.residence || !paths.selfie) {
      toast.error("Envie todos os documentos obrigatórios");
      return;
    }
    if (docType === "rg" && !paths.id_back) {
      toast.error("Envie o verso do RG");
      return;
    }
    setBusy(true);
    try {
      await submitFn({
        data: {
          transactionId,
          document_type: docType,
          id_front_path: paths.id_front!,
          id_back_path: docType === "rg" ? paths.id_back! : null,
          residence_path: paths.residence!,
          selfie_path: paths.selfie!,
        },
      });
      toast.success("Documentos enviados. A análise costuma levar algumas horas.");
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  const slots: Slot[] =
    docType === "rg"
      ? ["id_front", "id_back", "residence", "selfie"]
      : ["id_front", "residence", "selfie"];

  return (
    <AuthSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Confirmar identidade"
      width={480}
      description="Precisamos conferir seus documentos antes de liberar este saque. Os arquivos ficam guardados com acesso restrito e servem só para a verificação."
    >
      <div className="space-y-4">
        <div
          role="radiogroup"
          aria-label="Tipo de documento"
          className="grid grid-cols-2 gap-1 rounded-[10px] bg-surface p-1"
        >
          {(["rg", "cnh"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={docType === t}
              onClick={() => setDocType(t)}
              className={cn(
                "h-10 rounded-[7px] text-[14px] font-semibold transition-colors",
                docType === t ? "bg-surface-2 text-foreground" : "text-muted-foreground",
              )}
            >
              {t === "rg" ? "RG" : "CNH"}
            </button>
          ))}
        </div>

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
                    "flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed p-3 transition-colors",
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
                      if (f) uploadFile(slot, f);
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
                      {done ? "Enviado. Toque para trocar o arquivo." : meta.help}
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
          onClick={handleSubmit}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-[16px] font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : "Enviar para análise"}
        </button>
        <p className="text-center text-[12.5px] text-muted-foreground">
          Arquivos de até 8 MB, em JPG, PNG ou PDF.
        </p>
      </div>
    </AuthSheet>
  );
}
