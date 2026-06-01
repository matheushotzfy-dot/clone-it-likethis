import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({ component: Page });

function Page() {
  const get = useServerFn(getSettings);
  const upd = useServerFn(updateSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => get(), staleTime: 30_000, refetchOnWindowFocus: false });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const mut = useMutation({
    mutationFn: () => upd({ data: {
      min_deposit: Number(form.min_deposit),
      max_deposit: Number(form.max_deposit),
      min_withdraw: Number(form.min_withdraw),
      max_withdraw: Number(form.max_withdraw),
      withdrawal_fee_pct: Number(form.withdrawal_fee_pct),
      welcome_bonus: Number(form.welcome_bonus),
      maintenance_mode: !!form.maintenance_mode,
      active_gateway: (form.active_gateway === "bspay" ? "bspay" : "podpay") as "podpay" | "bspay",
    }}),
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return <div>Carregando...</div>;

  const field = (k: string, label: string, prefix?: string) => (
    <div>
      <label className="text-xs uppercase font-bold text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input type="number" step="0.01" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={prefix ? "pl-10" : ""} />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-bold">Depósitos</h2>
        <div className="grid grid-cols-2 gap-3">
          {field("min_deposit", "Mínimo", "R$")}
          {field("max_deposit", "Máximo", "R$")}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-bold">Saques</h2>
        <div className="grid grid-cols-2 gap-3">
          {field("min_withdraw", "Mínimo", "R$")}
          {field("max_withdraw", "Máximo", "R$")}
        </div>
        {field("withdrawal_fee_pct", "Taxa de saque (%)")}
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-bold">Bônus</h2>
        {field("welcome_bonus", "Bônus de boas-vindas", "R$")}
      </div>
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Modo manutenção</h2>
          <p className="text-sm text-muted-foreground">Bloqueia depósitos e saques temporariamente.</p>
        </div>
        <Switch checked={!!form.maintenance_mode} onCheckedChange={(v) => setForm({ ...form, maintenance_mode: v })} />
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} size="lg">
        {mut.isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  );
}
