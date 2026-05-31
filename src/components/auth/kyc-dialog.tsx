import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitKyc } from "@/lib/kyc.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload, FileCheck, ShieldCheck, X, Camera, FileText, Home } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  transactionId: string;
  open: boolean;
  onClose: () => void;
}

type DocType = "rg" | "cnh";
type Slot = "id_front" | "id_back" | "residence" | "selfie";

const SLOT_META: Record<Slot, { title: string; help: string; icon: any }> = {
  id_front: { title: "Documento — Frente", help: "RG ou CNH legível", icon: FileText },
  id_back: { title: "Documento — Verso", help: "Apenas para RG", icon: FileText },
  residence: { title: "Comprovante de Residência", help: "Conta de luz/água/internet dos últimos 90 dias", icon: Home },
  selfie: { title: "Selfie com o Documento", help: "Foto sua segurando o documento ao lado do rosto", icon: Camera },
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
    if (file.size > 8 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 8MB)"); return; }
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.type) && file.type !== "application/pdf") {
      toast.error("Envie uma imagem (JPG, PNG) ou PDF"); return;
    }
    setUploading(slot);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${transactionId}/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) { toast.error(error.message); return; }
    setPaths((p) => ({ ...p, [slot]: path }));
  }

  async function handleSubmit() {
    if (!paths.id_front || !paths.residence || !paths.selfie) {
      toast.error("Envie todos os documentos obrigatórios"); return;
    }
    if (docType === "rg" && !paths.id_back) {
      toast.error("Envie o verso do RG"); return;
    }
    setBusy(true);
    try {
      await submitFn({ data: {
        transactionId,
        document_type: docType,
        id_front_path: paths.id_front!,
        id_back_path: docType === "rg" ? paths.id_back! : null,
        residence_path: paths.residence!,
        selfie_path: paths.selfie!,
      }});
      toast.success("Documentos enviados! Aguarde a análise.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const slots: Slot[] = docType === "rg"
    ? ["id_front", "id_back", "residence", "selfie"]
    : ["id_front", "residence", "selfie"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 max-w-lg w-[calc(100vw-1rem)] bg-brand border-white/10 max-h-[92vh] sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-brand-2">
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="size-5 text-primary" />
            <span className="font-black uppercase text-sm tracking-wide">Verificação de Identidade</span>
          </DialogTitle>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 max-h-[calc(92vh-120px)]">
          <p className="text-xs text-white/70 leading-relaxed">
            Para liberar seu saque, precisamos confirmar sua identidade. Envie os documentos abaixo.
            Todas as imagens são protegidas e usadas apenas para verificação.
          </p>

          <div className="flex gap-2 bg-brand-2 p-1 rounded-lg">
            {(["rg", "cnh"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={`flex-1 h-10 rounded-md text-xs font-bold uppercase transition ${
                  docType === t ? "bg-primary text-primary-foreground" : "text-white/70"
                }`}
              >
                {t === "rg" ? "RG (frente + verso)" : "CNH"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {slots.map((slot) => {
              const meta = SLOT_META[slot];
              const Icon = meta.icon;
              const done = !!paths[slot];
              const isUp = uploading === slot;
              return (
                <label
                  key={slot}
                  className={`block border-2 border-dashed rounded-xl p-3 cursor-pointer transition ${
                    done ? "border-green-500/60 bg-green-500/5" : "border-white/15 hover:border-primary/60 bg-brand-2/30"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture={slot === "selfie" ? "user" : undefined}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(slot, f);
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                      done ? "bg-green-500 text-white" : "bg-primary/15 text-primary"
                    }`}>
                      {done ? <FileCheck className="size-5" /> : isUp ? (
                        <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : <Icon className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{meta.title}</p>
                      <p className="text-[11px] text-white/50 truncate">
                        {done ? "Arquivo enviado · toque para substituir" : meta.help}
                      </p>
                    </div>
                    {!done && !isUp && <Upload className="size-4 text-white/40 shrink-0" />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-brand-2 flex gap-2">
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-lg bg-white/5 text-white/80 font-bold text-sm hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-black uppercase text-sm hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Enviando..." : "Enviar para análise"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
