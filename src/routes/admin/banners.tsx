import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBannersAdmin, upsertBanner, deleteBanner, type Banner } from "@/lib/banners.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/banners")({ component: Page });

function Page() {
  const listFn = useServerFn(listBannersAdmin);
  const upsertFn = useServerFn(upsertBanner);
  const delFn = useServerFn(deleteBanner);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-banners"], queryFn: () => listFn(), staleTime: 30_000, refetchOnWindowFocus: false });

  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: (b: Partial<Banner>) => upsertFn({ data: {
      id: b.id,
      image_url: b.image_url!,
      title: b.title ?? null,
      link_url: b.link_url ?? null,
      sort_order: Number(b.sort_order ?? 0),
      active: b.active ?? true,
    } }),
    onSuccess: () => {
      toast.success("Banner salvo");
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["banners-public"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Banner removido");
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["banners-public"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("banners").upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); return null; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(path);
      return pub.publicUrl;
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Banners da Home</h1>
        <Button onClick={() => setEditing({ active: true, sort_order: 0 })}>
          <ImagePlus className="size-4 mr-2" /> Novo banner
        </Button>
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-bold">{editing.id ? "Editar banner" : "Novo banner"}</h2>
          {editing.image_url && (
            <img src={editing.image_url} alt="" className="w-full max-w-2xl aspect-[1280/280] object-cover rounded-lg border border-border" />
          )}
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Imagem (1280×280 recomendado)</label>
            <div className="flex gap-2 mt-1">
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const url = await uploadFile(file);
                  if (url) setEditing({ ...editing, image_url: url });
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Ou cole uma URL pública abaixo</p>
            <Input className="mt-2" placeholder="https://..." value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Título (opcional)</label>
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Link ao clicar (opcional)</label>
              <Input value={editing.link_url ?? ""} placeholder="https://..." onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Ordem</label>
              <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              <span className="text-sm font-bold">Ativo</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button disabled={!editing.image_url || save.isPending} onClick={() => save.mutate(editing)}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading && <div className="p-6 text-center text-muted-foreground">Carregando...</div>}
        {!isLoading && (data ?? []).length === 0 && <div className="p-6 text-center text-muted-foreground">Nenhum banner cadastrado. Os banners padrão estão sendo exibidos.</div>}
        <ul className="divide-y divide-border">
          {(data ?? []).map((b) => (
            <li key={b.id} className="p-3 flex items-center gap-3">
              <img src={b.image_url} alt={b.title ?? ""} className="w-32 h-12 object-cover rounded border border-border" />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{b.title || <span className="text-muted-foreground italic">sem título</span>}</div>
                <div className="text-xs text-muted-foreground truncate">{b.link_url || "sem link"} · ordem {b.sort_order} · {b.active ? "ativo" : "inativo"}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(b)}>Editar</Button>
              <Button variant="destructive" size="sm" onClick={() => { if (confirm("Apagar este banner?")) remove.mutate(b.id); }}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
