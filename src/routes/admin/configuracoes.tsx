import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import {
  getGatewayCredentials,
  updateGatewayCredentials,
} from "@/lib/gateway-credentials.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({ component: Page });

type Gateway = "podpay" | "bspay" | "veopag";

function Page() {
  const get = useServerFn(getSettings);
  const upd = useServerFn(updateSettings);
  const getCreds = useServerFn(getGatewayCredentials);
  const updCreds = useServerFn(updateGatewayCredentials);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => get(), staleTime: 30_000, refetchOnWindowFocus: false });
  const { data: creds } = useQuery({ queryKey: ["gateway-credentials"], queryFn: () => getCreds(), staleTime: 30_000, refetchOnWindowFocus: false });
  const [form, setForm] = useState<any>(null);
  const [credForm, setCredForm] = useState({ veopag_client_id: "", veopag_client_secret: "", veopag_webhook_signature: "" });
  useEffect(() => { if (data) setForm(data); }, [data]);
  useEffect(() => { if (creds) setCredForm(creds); }, [creds]);

  const mut = useMutation({
    mutationFn: () => upd({ data: {
      min_deposit: Number(form.min_deposit),
      max_deposit: Number(form.max_deposit),
      min_withdraw: Number(form.min_withdraw),
      max_withdraw: Number(form.max_withdraw),
      withdrawal_fee_pct: Number(form.withdrawal_fee_pct),
      welcome_bonus: Number(form.welcome_bonus),
      maintenance_mode: !!form.maintenance_mode,
      active_gateway: (["podpay", "bspay", "veopag"].includes(form.active_gateway) ? form.active_gateway : "veopag") as Gateway,
    }}),
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const credMut = useMutation({
    mutationFn: () => updCreds({ data: credForm }),
    onSuccess: () => { toast.success("Credenciais VeoPag salvas"); qc.invalidateQueries({ queryKey: ["gateway-credentials"] }); },
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

  const gatewayLabel: Record<Gateway, string> = { podpay: "PodPay", bspay: "BSPay", veopag: "VeoPag" };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-bold">Gateway de pagamento ativo</h2>
          <p className="text-sm text-muted-foreground">Define qual gateway processa novos depósitos PIX.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["veopag", "podpay", "bspay"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setForm({ ...form, active_gateway: g })}
              className={`h-16 rounded-xl border-2 font-black uppercase tracking-wider text-sm transition-all ${
                form.active_gateway === g
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {gatewayLabel[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-bold">Credenciais VeoPag</h2>
          <p className="text-sm text-muted-foreground">
            Configure em <a href="https://dashboard.veopag.com/credentials" target="_blank" rel="noreferrer" className="text-primary underline">dashboard.veopag.com</a>. Cadastre o IP do servidor na whitelist para saques.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Client ID</label>
            <Input className="mt-1" placeholder="cli_..." value={credForm.veopag_client_id} onChange={(e) => setCredForm({ ...credForm, veopag_client_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Client Secret</label>
            <Input className="mt-1" type="password" placeholder="••••••••" value={credForm.veopag_client_secret} onChange={(e) => setCredForm({ ...credForm, veopag_client_secret: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground">Webhook Signature (opcional)</label>
            <Input className="mt-1" type="password" placeholder="segredo do header X-Webhook-Signature" value={credForm.veopag_webhook_signature} onChange={(e) => setCredForm({ ...credForm, veopag_webhook_signature: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">
            URL do webhook (configure no portal VeoPag): <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/public/veopag-webhook</code>
          </p>
          <Button onClick={() => credMut.mutate()} disabled={credMut.isPending}>
            {credMut.isPending ? "Salvando..." : "Salvar credenciais VeoPag"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          PodPay / BSPay continuam configurados via secrets do servidor.
        </p>
      </div>

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
