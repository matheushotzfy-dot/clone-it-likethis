import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSettings, updateSettings, type AppSettings } from "@/lib/settings.functions";
import {
  getGatewayCredentials,
  updateGatewayCredentials,
} from "@/lib/gateway-credentials.functions";
import { PageHeader, Panel, Segmented } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | admin" }] }),
  component: Page,
});

type NumKey =
  | "min_deposit"
  | "max_deposit"
  | "min_withdraw"
  | "max_withdraw"
  | "withdrawal_fee_pct"
  | "min_bet_sports"
  | "max_bet_sports"
  | "max_payout_sports";

function Page() {
  const qc = useQueryClient();
  const get = useServerFn(getSettings);
  const upd = useServerFn(updateSettings);
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => get() });
  const [form, setForm] = useState<AppSettings | null>(null);
  const [confirmMoney, setConfirmMoney] = useState(false);
  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => upd({ data: patch }),
    onSuccess: () => {
      toast.success("Configurações salvas. Valem em poucos segundos.");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) return <div className="skeleton h-96 rounded-[12px]" />;
  const setNum = (k: NumKey, v: string) =>
    setForm({ ...form, [k]: Number(v.replace(",", ".")) || 0 });
  const toggle =
    (k: "maintenance_mode" | "casino_enabled" | "sports_enabled" | "signup_enabled") =>
    (v: boolean) =>
      save.mutate({ [k]: v });

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="Configurações" description="Cada mudança fica registrada na auditoria." />

      <Panel title="Dinheiro real">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[15px] font-semibold">
              {form.real_money_enabled
                ? "Ligado: jogadores depositam e sacam de verdade"
                : "Desligado: plataforma em homologação"}
            </p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Com ele desligado, o banco recusa qualquer depósito ou saque de jogador e o site
              mostra o aviso de homologação. Só o admin consegue lançar crédito de teste. Ligue
              apenas com a autorização da SPA publicada.
            </p>
          </div>
          <Switch
            checked={form.real_money_enabled}
            onCheckedChange={(v) =>
              v ? setConfirmMoney(true) : save.mutate({ real_money_enabled: false })
            }
            aria-label="Dinheiro real"
          />
        </div>
      </Panel>

      <Panel title="O que fica aberto">
        <ul className="divide-y divide-border">
          <Toggle
            label="Manutenção"
            hint="Bloqueia depósitos, saques, apostas e abertura de jogos e mostra um aviso no topo do site."
            checked={form.maintenance_mode}
            onChange={toggle("maintenance_mode")}
          />
          <Toggle
            label="Cassino"
            hint="Desligado, nenhum jogo abre."
            checked={form.casino_enabled}
            onChange={toggle("casino_enabled")}
          />
          <Toggle
            label="Esportes"
            hint="Desligado, ninguém faz aposta nova. As abertas continuam sendo liquidadas."
            checked={form.sports_enabled}
            onChange={toggle("sports_enabled")}
          />
          <Toggle
            label="Novos cadastros"
            hint="Desligado, o cadastro mostra que está fechado."
            checked={form.signup_enabled}
            onChange={toggle("signup_enabled")}
          />
        </ul>
      </Panel>

      <Panel title="Limites de valor">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              min_deposit: form.min_deposit,
              max_deposit: form.max_deposit,
              min_withdraw: form.min_withdraw,
              max_withdraw: form.max_withdraw,
              withdrawal_fee_pct: form.withdrawal_fee_pct,
              min_bet_sports: form.min_bet_sports,
              max_bet_sports: form.max_bet_sports,
              max_payout_sports: form.max_payout_sports,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Num
              label="Depósito mínimo"
              value={form.min_deposit}
              onChange={(v) => setNum("min_deposit", v)}
            />
            <Num
              label="Depósito máximo"
              value={form.max_deposit}
              onChange={(v) => setNum("max_deposit", v)}
            />
            <Num
              label="Saque mínimo"
              value={form.min_withdraw}
              onChange={(v) => setNum("min_withdraw", v)}
            />
            <Num
              label="Saque máximo"
              value={form.max_withdraw}
              onChange={(v) => setNum("max_withdraw", v)}
            />
            <Num
              label="Taxa de saque (%)"
              value={form.withdrawal_fee_pct}
              onChange={(v) => setNum("withdrawal_fee_pct", v)}
              suffix="%"
            />
            <Num
              label="Aposta esportiva mínima"
              value={form.min_bet_sports}
              onChange={(v) => setNum("min_bet_sports", v)}
            />
            <Num
              label="Aposta esportiva máxima"
              value={form.max_bet_sports}
              onChange={(v) => setNum("max_bet_sports", v)}
            />
            <Num
              label="Prêmio máximo por aposta"
              value={form.max_payout_sports}
              onChange={(v) => setNum("max_payout_sports", v)}
            />
          </div>
          <Button
            type="submit"
            disabled={save.isPending}
            className="h-11 rounded-[10px] px-6 font-bold shadow-none"
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : "Salvar limites"}
          </Button>
        </form>
      </Panel>

      <Panel title="Gateway de Pix">
        <p className="mb-3 text-[14px] text-muted-foreground">
          Só o gateway ativo gera Pix. Os outros recusam cobranças novas.
        </p>
        <Segmented
          value={form.active_gateway}
          onChange={(v) => save.mutate({ active_gateway: v })}
          options={[
            { id: "teste", label: "Teste (homologação)" },
            { id: "veopag", label: "VeoPag" },
            { id: "podpay", label: "PodPay" },
            { id: "bspay", label: "BSPay" },
          ]}
        />
        {form.active_gateway === "teste" && (
          <p className="mt-3 text-[13.5px] text-muted-foreground">
            O gateway de teste gera um Pix simulado, sem valor. O jogador ou o admin clica em
            simular pagamento e o crédito passa pelo mesmo caminho de um depósito real. Só funciona
            com dinheiro real desligado.
          </p>
        )}
      </Panel>

      <Panel title="Cadastro e identidade">
        <ul className="divide-y divide-border">
          <Toggle
            label="Exigir identidade verificada"
            hint="Sem documento e selfie aprovados, a conta não deposita, não aposta e não saca. Obrigatório para ligar dinheiro real."
            checked={form.require_identity}
            onChange={(v) => save.mutate({ require_identity: v })}
          />
        </ul>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ terms_version: form.terms_version.trim() });
          }}
        >
          <Text
            label="Versão dos termos"
            hint="Troque quando mudar os Termos ou a Privacidade. Todo jogador precisa aceitar de novo antes de jogar."
            value={form.terms_version}
            onChange={(v) => setForm({ ...form, terms_version: v.slice(0, 20) })}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={save.isPending}
            className="h-11 rounded-[10px] px-5 shadow-none"
          >
            Publicar versão
          </Button>
        </form>
      </Panel>

      <Panel title="Atendimento e empresa">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              support_email: form.support_email.trim(),
              support_whatsapp: form.support_whatsapp.replace(/\D/g, ""),
              support_hours: form.support_hours.trim(),
              ouvidoria_email: form.ouvidoria_email.trim(),
              company_name: form.company_name.trim(),
              company_cnpj: form.company_cnpj.replace(/\D/g, ""),
              spa_authorization: form.spa_authorization.trim(),
            });
          }}
        >
          <p className="text-[14px] text-muted-foreground">
            Aparecem na página de atendimento, no rodapé, nos termos e no informe anual dos
            jogadores.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              label="E-mail do atendimento"
              value={form.support_email}
              onChange={(v) => setForm({ ...form, support_email: v })}
            />
            <Text
              label="WhatsApp do atendimento"
              value={form.support_whatsapp}
              onChange={(v) => setForm({ ...form, support_whatsapp: v })}
              placeholder="(44) 99999-9999"
            />
            <Text
              label="Horário de atendimento"
              value={form.support_hours}
              onChange={(v) => setForm({ ...form, support_hours: v })}
            />
            <Text
              label="E-mail da ouvidoria"
              value={form.ouvidoria_email}
              onChange={(v) => setForm({ ...form, ouvidoria_email: v })}
            />
            <Text
              label="Razão social"
              value={form.company_name}
              onChange={(v) => setForm({ ...form, company_name: v })}
            />
            <Text
              label="CNPJ"
              value={form.company_cnpj}
              onChange={(v) => setForm({ ...form, company_cnpj: v })}
              placeholder="00.000.000/0001-00"
            />
            <Text
              label="Autorização SPA/MF"
              hint="Número da portaria de autorização, quando publicada."
              value={form.spa_authorization}
              onChange={(v) => setForm({ ...form, spa_authorization: v })}
            />
          </div>
          <Button
            type="submit"
            disabled={save.isPending}
            className="h-11 rounded-[10px] px-6 font-bold shadow-none"
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : "Salvar"}
          </Button>
        </form>
      </Panel>

      <Credentials />

      <AlertDialog open={confirmMoney} onOpenChange={setConfirmMoney}>
        <AlertDialogContent className="rounded-[16px] border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[24px]">Ligar dinheiro real?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14.5px]">
              A partir daqui o site recebe Pix de verdade e paga saques. Confirme que a autorização
              da SPA está publicada e vigente, que a oferta de apostas é permitida pela lei em vigor
              e que os gateways e a PlayFivers estão com as credenciais de produção. Antes, zere os
              saldos de teste dos jogadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px]">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[10px]"
              onClick={() => save.mutate({ real_money_enabled: true })}
            >
              Ligar dinheiro real
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="text-[13.5px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </li>
  );
}

function Text({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13.5px] font-semibold">{label}</span>
      <input
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="mt-1 block text-[12.5px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value).replace(".", ","));
  useEffect(() => setText(String(value).replace(".", ",")), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[13.5px] font-semibold">{label}</span>
      <span className="relative block">
        {!suffix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            R$
          </span>
        )}
        <input
          className={`field-input num ${suffix ? "" : "pl-10"}`}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d,]/g, "");
            setText(t);
            onChange(t);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function Credentials() {
  const qc = useQueryClient();
  const getCreds = useServerFn(getGatewayCredentials);
  const updCreds = useServerFn(updateGatewayCredentials);
  const creds = useQuery({ queryKey: ["admin-gateway-creds"], queryFn: () => getCreds() });
  const [form, setForm] = useState({
    veopag_client_id: "",
    veopag_client_secret: "",
    veopag_webhook_signature: "",
  });
  const save = useMutation({
    mutationFn: () =>
      updCreds({ data: Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim())) }),
    onSuccess: () => {
      toast.success("Credenciais salvas.");
      setForm({ veopag_client_id: "", veopag_client_secret: "", veopag_webhook_signature: "" });
      qc.invalidateQueries({ queryKey: ["admin-gateway-creds"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const c = creds.data;
  const fields = [
    { k: "veopag_client_id" as const, label: "Client ID" },
    { k: "veopag_client_secret" as const, label: "Client secret" },
    { k: "veopag_webhook_signature" as const, label: "Assinatura do webhook" },
  ];
  return (
    <Panel title="Credenciais da VeoPag">
      <p className="mb-4 text-[14px] text-muted-foreground">
        Os valores salvos não são mostrados de novo. Preencha só o que quiser trocar. Segredos do
        projeto (VEOPAG_CLIENT_ID e VEOPAG_CLIENT_SECRET) têm prioridade sobre estes.
      </p>
      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {fields.map((f) => (
          <label key={f.k} className="block">
            <span className="mb-1 block text-[13.5px] font-semibold">{f.label}</span>
            <input
              className="field-input"
              type={f.k === "veopag_client_id" ? "text" : "password"}
              autoComplete="off"
              value={form[f.k]}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              placeholder={c?.[f.k]?.set ? `Salvo (${c[f.k].hint})` : "Não configurado"}
            />
          </label>
        ))}
        <div className="sm:col-span-3">
          <Button
            type="submit"
            disabled={save.isPending || !Object.values(form).some((v) => v.trim())}
            className="h-11 rounded-[10px] px-6 font-bold shadow-none"
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : "Salvar credenciais"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
