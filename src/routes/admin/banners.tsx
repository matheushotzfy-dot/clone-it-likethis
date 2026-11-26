import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteBanner, listBannersAdmin, upsertBanner, type Banner } from "@/lib/banners.functions";
import { supabase } from "@/integrations/supabase/client";
import { Empty, ErrorBox, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banners | admin" }] }),
  component: Page,
});

type Draft = Partial<Banner>;
const MAX_MB = 3;

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBannersAdmin);
  const upsertFn = useServerFn(upsertBanner);
  const delFn = useServerFn(deleteBanner);
  const q = useQuery({ queryKey: ["admin-banners"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Banner | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["banners-public"] });
  };

  const save = useMutation({
    mutationFn: (b: Draft) =>
      upsertFn({
        data: {
          id: b.id,
          image_url: b.image_url ?? "",
          title: b.title ?? null,
          link_url: b.link_url ?? null,
          sort_order: Number(b.sort_order ?? 0),
          active: b.active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Banner salvo.");
      setEditing(null);
      refresh();
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("[") ? "Confira a imagem e o link." : e.message),
  });
  const toggle = useMutation({
    mutationFn: (b: Banner) => upsertFn({ data: { ...b, active: !b.active } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Banner apagado.");
      setRemoving(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = (q.data ?? []).filter((b) => b.active).length;
  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Banners da página inicial"
        description={
          active
            ? `${active} ${active === 1 ? "banner aparece" : "banners aparecem"} no carrossel do início, na ordem abaixo.`
            : "Sem banner ativo, o carrossel não aparece no início."
        }
        actions={
          <Button
            onClick={() =>
              setEditing({
                active: true,
                sort_order: ((q.data ?? []).at(-1)?.sort_order ?? 0) + 10,
              })
            }
            className="h-10 rounded-[10px] font-bold shadow-none"
          >
            Novo banner
          </Button>
        }
      />
      {q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Panel flush>
          {q.isLoading ? (
            <div className="skeleton m-5 h-24 rounded-[10px]" />
          ) : !q.data?.length ? (
            <Empty>Nenhum banner cadastrado.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {q.data.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 px-5 py-3.5",
                    !b.active && "opacity-60",
                  )}
                >
                  <img
                    src={b.image_url}
                    alt=""
                    className="aspect-[3.6/1] w-44 rounded-[8px] border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{b.title || "Sem título"}</p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {b.link_url ? `Abre ${b.link_url}` : "Sem link"}
                    </p>
                    <p className="num text-[12.5px] text-muted-foreground">Ordem {b.sort_order}</p>
                  </div>
                  <label className="flex items-center gap-2 text-[13.5px]">
                    <Switch
                      checked={b.active}
                      onCheckedChange={() => toggle.mutate(b)}
                      aria-label={`Mostrar ${b.title || "banner"}`}
                    />
                    {b.active ? "No ar" : "Fora do ar"}
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-[8px]"
                    onClick={() => setEditing(b)}
                  >
                    Editar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setRemoving(b)}
                    aria-label="Apagar banner"
                    className="grid size-9 place-items-center rounded-[8px] text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Editor
        draft={editing}
        onClose={() => setEditing(null)}
        onSave={(d) => save.mutate(d)}
        saving={save.isPending}
      />

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="rounded-[16px] border-border bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Apagar banner?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            Ele sai do carrossel na hora. Para tirar só por um tempo, use a chave No ar.
          </p>
          <DialogFooter>
            <Button variant="outline" className="rounded-[10px]" onClick={() => setRemoving(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              className="rounded-[10px]"
              disabled={remove.isPending}
              onClick={() => removing && remove.mutate(removing.id)}
            >
              Apagar banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Editor({
  draft,
  onClose,
  onSave,
  saving,
}: {
  draft: Draft | null;
  onClose: () => void;
  onSave: (d: Draft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<Draft>({});
  const [uploading, setUploading] = useState(false);
  const [openFor, setOpenFor] = useState<Draft | null>(null);
  if (draft !== openFor) {
    setOpenFor(draft);
    setD(draft ?? {});
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/"))
      return toast.error("Escolha uma imagem (JPG, PNG ou WebP).");
    if (file.size > MAX_MB * 1024 * 1024)
      return toast.error(`A imagem passa de ${MAX_MB} MB. Exporte menor.`);
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("banners")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) return toast.error(error.message);
      setD((cur) => ({
        ...cur,
        image_url: supabase.storage.from("banners").getPublicUrl(path).data.publicUrl,
      }));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-[16px] border-border bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[24px]">
            {d.id ? "Editar banner" : "Novo banner"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="relative aspect-[3.6/1] overflow-hidden rounded-[12px] border border-border bg-surface">
              {d.image_url ? (
                <img src={d.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-[13.5px] text-muted-foreground">
                  A imagem aparece aqui
                </div>
              )}
              {d.image_url && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-1/2 w-[61%] -translate-x-1/2 border-x border-dashed border-white/50"
                />
              )}
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              Use 1440×400 px. No celular o banner é cortado nas laterais: deixe texto e rosto
              dentro da área tracejada.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-border px-4 text-[14px] font-semibold hover:border-primary/60",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}{" "}
              {d.image_url ? "Trocar imagem" : "Enviar imagem"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-[13px] text-muted-foreground">ou cole o endereço</span>
            <input
              className="field-input h-10 min-w-[220px] flex-1"
              placeholder="https://..."
              value={d.image_url ?? ""}
              onChange={(e) => setD({ ...d, image_url: e.target.value })}
              aria-label="Endereço da imagem"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[13.5px] font-semibold">Texto alternativo</span>
              <input
                className="field-input"
                maxLength={120}
                value={d.title ?? ""}
                onChange={(e) => setD({ ...d, title: e.target.value })}
                placeholder="O que o banner diz, para leitor de tela"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13.5px] font-semibold">Abre ao clicar</span>
              <input
                className="field-input"
                value={d.link_url ?? ""}
                onChange={(e) => setD({ ...d, link_url: e.target.value })}
                placeholder="/cassino ou https://..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13.5px] font-semibold">Ordem</span>
              <input
                className="field-input num"
                inputMode="numeric"
                value={String(d.sort_order ?? 0)}
                onChange={(e) =>
                  setD({
                    ...d,
                    sort_order: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || 0,
                  })
                }
              />
            </label>
            <label className="flex items-center gap-3 self-end pb-2.5 text-[14px] font-semibold">
              <Switch
                checked={d.active ?? true}
                onCheckedChange={(v) => setD({ ...d, active: v })}
              />
              No ar
            </label>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Banner de promoção só com a promoção cadastrada de verdade e as regras completas
            publicadas.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-[10px]" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-[10px] font-bold shadow-none"
            disabled={!d.image_url || saving || uploading}
            onClick={() => onSave(d)}
          >
            {saving ? <Loader2 className="animate-spin" /> : "Salvar banner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
