import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AccountLayout, Section, SubTabs } from "@/components/account/account-layout";
import { Field } from "@/components/auth/auth-sheet";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile } from "@/lib/profile.functions";
import { getMyLimits, selfExclude, setMyLimits } from "@/lib/wallet.functions";
import { clearMyLoginLock } from "@/lib/auth.functions";
import { closeMyAccount, endMyPause, pauseMe } from "@/lib/account.functions";
import { passwordOk } from "@/lib/password-policy";
import {
  AddressFields,
  addressErrors,
  EMPTY_ADDRESS,
  NATIONALITIES,
  PasswordChecklist,
  type Address,
} from "@/components/auth/register-dialog";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useIdentity } from "@/components/auth/identity-dialog";
import { useRgStatus } from "@/components/account/play-guard";
import { usePublicSettings, useProfile, useWallet } from "@/hooks/use-account";
import { useAuth } from "@/hooks/use-auth";
import { maskCPF, maskPhone } from "@/lib/validations";
import { formatBRL, formatDate, formatDateTime, parseBRL } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { cn } from "@/lib/utils";

type Aba = "dados" | "seguranca" | "limites";

export const Route = createFileRoute("/_authenticated/perfil")({
  validateSearch: (s: Record<string, unknown>): { aba?: Aba } => ({
    aba: s.aba === "seguranca" || s.aba === "limites" ? s.aba : undefined,
  }),
  head: () => ({
    meta: pageMeta("Minha conta | apostamaxy", "Dados pessoais, segurança e limites de jogo."),
  }),
  component: Page,
});

function Page() {
  const { aba = "dados" } = Route.useSearch();
  const navigate = useNavigate({ from: "/perfil" });
  return (
    <AccountLayout title="Minha conta">
      <SubTabs<Aba>
        value={aba}
        onChange={(id) =>
          navigate({ search: { aba: id === "dados" ? undefined : id }, replace: true })
        }
        options={[
          { id: "dados", label: "Dados pessoais" },
          { id: "seguranca", label: "Segurança" },
          { id: "limites", label: "Limites de jogo" },
        ]}
      />
      {aba === "dados" && <PersonalData />}
      {aba === "seguranca" && <Security />}
      {aba === "limites" && <Limits />}
    </AccountLayout>
  );
}

function ReadOnly({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[13.5px] font-semibold text-foreground/90">{label}</p>
      <p className="num mt-1 text-[16px]">{value || "Não informado"}</p>
      {hint && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PersonalData() {
  const { user } = useAuth();
  const profile = useProfile();
  const qc = useQueryClient();
  const update = useServerFn(updateMyProfile);
  const p = profile.data;
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [addrErrors, setAddrErrors] = useState<ReturnType<typeof addressErrors>>({});
  useEffect(() => {
    if (!p) return;
    setUsername(p.username ?? "");
    setPhone(maskPhone(p.phone ?? ""));
    setNationality(p.nationality ?? "");
    setAddress({
      zip: p.address_zip ? p.address_zip.replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
      street: p.address_street ?? "",
      number: p.address_number ?? "",
      complement: p.address_complement ?? "",
      district: p.address_district ?? "",
      city: p.address_city ?? "",
      state: p.address_state ?? "",
    });
  }, [p]);

  const saveAddress = useMutation({
    mutationFn: () =>
      update({
        data: {
          nationality: nationality || undefined,
          address: {
            zip: address.zip.replace(/\D/g, ""),
            street: address.street.trim(),
            number: address.number.trim(),
            complement: address.complement.trim(),
            district: address.district.trim(),
            city: address.city.trim(),
            state: address.state,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Endereço salvo.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      update({
        data: {
          username: username.trim() !== p?.username ? username.trim() : undefined,
          phone:
            phone.replace(/\D/g, "") !== (p?.phone ?? "") ? phone.replace(/\D/g, "") : undefined,
          full_name: !p?.full_name && fullName.trim() ? fullName.trim() : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Dados salvos.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setFullName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!p) return <div className="skeleton h-64 rounded-[14px]" />;

  return (
    <div className="space-y-4">
      <Section
        title="Identificação"
        description="Esses dados vêm do cadastro e precisam bater com o seu documento."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {p.full_name ? (
            <ReadOnly
              label="Nome completo"
              value={p.full_name}
              hint="Para corrigir, fale com o suporte."
            />
          ) : (
            <Field
              label="Nome completo"
              htmlFor="pf-name"
              hint="Escreva como está no documento. Depois de salvo, só o suporte altera."
            >
              <input
                id="pf-name"
                className="field-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </Field>
          )}
          <ReadOnly
            label="CPF"
            value={p.cpf ? maskCPF(p.cpf) : ""}
            hint="Seus saques vão para a chave Pix deste CPF."
          />
          <ReadOnly
            label="Data de nascimento"
            value={p.birth_date ? formatDate(p.birth_date + "T12:00:00Z") : ""}
          />
          <ReadOnly label="E-mail" value={user?.email ?? ""} />
        </div>
      </Section>

      <IdentityCard />

      <Section
        title="Endereço e nacionalidade"
        description="Mantenha o endereço de residência atualizado. Ele faz parte do cadastro exigido por lei."
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const errs = addressErrors(address);
            setAddrErrors(errs);
            if (!Object.keys(errs).length) saveAddress.mutate();
          }}
        >
          <div className="sm:max-w-xs">
            <Field label="Nacionalidade" htmlFor="pf-nat">
              <select
                id="pf-nat"
                className="field-input"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              >
                <option value="" disabled>
                  Escolha
                </option>
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <AddressFields
            idPrefix="pf-addr"
            value={address}
            onChange={(a) => {
              setAddress(a);
              setAddrErrors({});
            }}
            errors={addrErrors}
          />
          <Button
            type="submit"
            disabled={saveAddress.isPending}
            className="h-11 rounded-[10px] px-6 font-bold shadow-none"
          >
            {saveAddress.isPending ? <Loader2 className="animate-spin" /> : "Salvar endereço"}
          </Button>
        </form>
      </Section>

      <Section title="Contato e usuário">
        <form
          className="grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Nome de usuário" htmlFor="pf-user" hint="Aparece em torneios e rankings.">
            <input
              id="pf-user"
              className="field-input"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30))
              }
            />
          </Field>
          <Field label="Celular" htmlFor="pf-phone">
            <input
              id="pf-phone"
              className="field-input num"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={save.isPending}
              className="h-11 rounded-[10px] px-6 font-bold shadow-none"
            >
              {save.isPending ? <Loader2 className="animate-spin" /> : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </Section>

      <p className="px-1 text-[13px] text-muted-foreground">
        Conta criada em {formatDate(p.created_at)}.
      </p>
    </div>
  );
}

function IdentityCard() {
  const identity = useIdentity();
  const settings = usePublicSettings();
  const { open } = useAuthDialog();
  const st = identity.data?.status ?? "none";
  const copy = {
    verified: "Identidade verificada. Depósitos, apostas e saques liberados.",
    pending: "Documentos em análise. Avisamos assim que terminar.",
    rejected: `Documentos recusados: ${identity.data?.rejectionReason ?? "envie fotos mais nítidas"}.`,
    none: settings.data?.requireIdentity
      ? "Envie um documento com foto e uma selfie para liberar depósitos e apostas."
      : "Envie um documento com foto e uma selfie para confirmar quem é o titular da conta.",
  }[st];
  return (
    <Section title="Verificação de identidade">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-[14.5px]">
          <BadgeCheck
            className={cn(
              "mt-0.5 size-5 shrink-0",
              st === "verified"
                ? "text-live"
                : st === "rejected"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          />
          {copy}
        </p>
        {(st === "none" || st === "rejected") && (
          <Button
            onClick={() => open("identity")}
            className="h-11 shrink-0 rounded-[10px] px-5 font-bold shadow-none"
          >
            {st === "rejected" ? "Enviar de novo" : "Verificar agora"}
          </Button>
        )}
      </div>
    </Section>
  );
}

function Security() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { signOut } = useAuth();
  const unlock = useServerFn(clearMyLoginLock);
  const status = useRgStatus();

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordOk(password)) {
      setError(
        "A senha precisa de 8 caracteres ou mais, com letras, números e um caractere especial.",
      );
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(
        err.message.toLowerCase().includes("different")
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível trocar a senha agora.",
      );
      return;
    }
    // Senha nova libera o bloqueio de tentativas erradas.
    await unlock().catch(() => null);
    setPassword("");
    setConfirm("");
    setError(null);
    toast.success("Senha alterada.");
  }

  async function signOutEverywhere() {
    await supabase.auth.signOut({ scope: "global" });
    await signOut();
    toast.success("Você saiu de todos os aparelhos.");
  }

  const prev = status.data?.previousLoginAt;

  return (
    <div className="space-y-4">
      <Section title="Trocar senha">
        <form className="grid max-w-md gap-4" onSubmit={change}>
          <Field label="Nova senha" htmlFor="sec-pass">
            <input
              id="sec-pass"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="new-password"
            />
            <PasswordChecklist password={password} />
          </Field>
          <Field label="Repita a nova senha" htmlFor="sec-pass2" error={error ?? undefined}>
            <input
              id="sec-pass2"
              type="password"
              className="field-input"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              autoComplete="new-password"
            />
          </Field>
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-fit rounded-[10px] px-6 font-bold shadow-none"
          >
            {busy ? <Loader2 className="animate-spin" /> : "Salvar nova senha"}
          </Button>
        </form>
      </Section>
      <Section
        title="Acessos"
        description="Depois de 3 senhas erradas a conta é bloqueada; para desbloquear, crie uma senha nova pelo link do e-mail."
      >
        <p className="mb-4 text-[14.5px]">
          {status.data?.lastLoginAt ? (
            <>
              Acesso atual iniciado em{" "}
              <strong className="num font-semibold">
                {formatDateTime(status.data.lastLoginAt)}
              </strong>
              .
              {prev && (
                <>
                  {" "}
                  Acesso anterior em{" "}
                  <strong className="num font-semibold">{formatDateTime(prev)}</strong>.
                </>
              )}
            </>
          ) : (
            "Ainda não há acessos registrados."
          )}
        </p>
        <Button
          variant="secondary"
          onClick={signOutEverywhere}
          className="h-11 rounded-[10px] px-5 shadow-none"
        >
          Sair de todos os aparelhos
        </Button>
      </Section>
      <CloseAccount />
    </div>
  );
}

const CLOSE_REASONS = [
  "Não quero mais apostar",
  "Estou gastando mais do que devia",
  "Vou usar outra plataforma",
  "Outro motivo",
];

function CloseAccount() {
  const wallet = useWallet();
  const { signOut } = useAuth();
  const close = useServerFn(closeMyAccount);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CLOSE_REASONS[0]);
  const balance = wallet.data?.balance ?? 0;
  const held = wallet.data?.held ?? 0;
  const mut = useMutation({
    mutationFn: () => close({ data: { reason } }),
    onSuccess: async () => {
      setOpen(false);
      toast.success("Conta encerrada. Seus dados ficam guardados pelo prazo que a lei exige.");
      await signOut();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const blocked = balance > 0 || held > 0;
  return (
    <Section
      title="Encerrar conta"
      description="Fecha a conta de vez. Antes, saque todo o saldo. O histórico fica guardado pelo prazo legal e você pode pedir a reabertura ao atendimento."
    >
      {blocked && (
        <p className="mb-4 text-[14px] text-muted-foreground">
          {balance > 0
            ? `Você ainda tem ${formatBRL(balance)} de saldo. Saque tudo antes de encerrar.`
            : "Há um saque em andamento. Espere ele terminar para encerrar."}
        </p>
      )}
      <Button
        variant="destructive"
        disabled={blocked}
        onClick={() => setOpen(true)}
        className="h-11 rounded-[10px] px-5 font-bold shadow-none"
      >
        Encerrar minha conta
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-[16px] border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[24px]">Encerrar a conta?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14.5px]">
              Você sai agora e não consegue mais entrar com este CPF e e-mail, a menos que peça a
              reabertura ao atendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field label="Motivo" htmlFor="close-reason">
            <select
              id="close-reason"
              className="field-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {CLOSE_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px]">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                mut.mutate();
              }}
              className="rounded-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {mut.isPending ? <Loader2 className="animate-spin" /> : "Encerrar conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

const MONEY_LIMITS = [
  { kind: "deposit", label: "Depósito", hint: "Soma dos depósitos aprovados no período." },
  {
    kind: "loss",
    label: "Perda",
    hint: "Apostas menos ganhos no período, somando cassino e esportes.",
  },
] as const;
const PERIODS = [
  { id: "daily", label: "Por dia" },
  { id: "weekly", label: "Por semana" },
  { id: "monthly", label: "Por mês" },
] as const;
const ALERTS = [15, 30, 45, 60, 90, 120] as const;
const ALERT_LABEL: Record<(typeof ALERTS)[number], string> = {
  15: "15 minutos",
  30: "30 minutos",
  45: "45 minutos",
  60: "1 hora",
  90: "1h30",
  120: "2 horas",
};
type MoneyKey = `${(typeof MONEY_LIMITS)[number]["kind"]}_${(typeof PERIODS)[number]["id"]}`;
type LimitValues = Record<MoneyKey | "bets_daily" | "session_minutes", string> & {
  session_alert_minutes: string;
};
const EMPTY_LIMITS: LimitValues = {
  deposit_daily: "",
  deposit_weekly: "",
  deposit_monthly: "",
  loss_daily: "",
  loss_weekly: "",
  loss_monthly: "",
  bets_daily: "",
  session_minutes: "",
  session_alert_minutes: "60",
};

const SPA_SELF_EXCLUSION = "https://www.gov.br/autoexclusaoapostas";

function Limits() {
  const fetchLimits = useServerFn(getMyLimits);
  const save = useServerFn(setMyLimits);
  const exclude = useServerFn(selfExclude);
  const pause = useServerFn(pauseMe);
  const endPause = useServerFn(endMyPause);
  const wallet = useWallet();
  const qc = useQueryClient();
  const limits = useQuery({ queryKey: ["rg-limits"], queryFn: () => fetchLimits() });
  const [values, setValues] = useState<LimitValues>(EMPTY_LIMITS);
  const [days, setDays] = useState<1 | 7 | 30 | 90 | 180 | 365 | 3650>(30);
  const [pauseDays, setPauseDays] = useState<1 | 3 | 7 | 14 | 30>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = () => {
    for (const k of ["rg-limits", "rg-status", "wallet"]) qc.invalidateQueries({ queryKey: [k] });
  };

  useEffect(() => {
    const l = limits.data;
    if (!l) return;
    const fmt = (n: number | null | undefined) =>
      n === null || n === undefined ? "" : String(n).replace(".", ",");
    setValues({
      deposit_daily: fmt(l.deposit_daily),
      deposit_weekly: fmt(l.deposit_weekly),
      deposit_monthly: fmt(l.deposit_monthly),
      loss_daily: fmt(l.loss_daily),
      loss_weekly: fmt(l.loss_weekly),
      loss_monthly: fmt(l.loss_monthly),
      bets_daily: l.bets_daily ? String(l.bets_daily) : "",
      session_minutes: l.session_minutes ? String(l.session_minutes) : "",
      session_alert_minutes: String(l.session_alert_minutes ?? 60),
    });
  }, [limits.data]);

  const saveLimits = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() ? parseBRL(v) : null);
      const i = (v: string) => (v.trim() ? Number(v) : null);
      return save({
        data: {
          deposit_daily: n(values.deposit_daily),
          deposit_weekly: n(values.deposit_weekly),
          deposit_monthly: n(values.deposit_monthly),
          loss_daily: n(values.loss_daily),
          loss_weekly: n(values.loss_weekly),
          loss_monthly: n(values.loss_monthly),
          bets_daily: i(values.bets_daily),
          session_minutes: i(values.session_minutes),
          session_alert_minutes: Number(values.session_alert_minutes) as (typeof ALERTS)[number],
        },
      });
    },
    onSuccess: (r) => {
      const pending = Object.keys(r.pending ?? {}).length;
      toast.success(
        pending
          ? "Limites salvos. Os aumentos passam a valer em 24 horas."
          : "Limites salvos e já valendo.",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doExclude = useMutation({
    mutationFn: () => exclude({ data: { days, reason: "" } }),
    onSuccess: (r) => {
      toast.success(`Autoexclusão ativa até ${formatDate(r.until)}.`);
      refresh();
      setConfirmOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const doPause = useMutation({
    mutationFn: () => pause({ data: { days: pauseDays } }),
    onSuccess: (r) => {
      toast.success(`Pausa ativa até ${formatDateTime(r.until)}. Saques continuam liberados.`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const doEndPause = useMutation({
    mutationFn: () => endPause(),
    onSuccess: (r) => {
      toast.success(
        r.until ? `A pausa termina em ${formatDateTime(r.until)}.` : "Pausa encerrada.",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const l = limits.data;
  const pending = l?.pending as Record<string, number | null> | null | undefined;
  const excludedUntil = wallet.data?.selfExcludedUntil;
  const pausedUntil =
    l?.paused_until && new Date(l.paused_until) > new Date() ? l.paused_until : null;
  const pendingHint = (key: string, money = true) =>
    pending && key in pending
      ? `Muda para ${pending[key] === null ? "sem limite" : money ? formatBRL(pending[key]) : pending[key]} em ${formatDateTime(l?.pending_effective_at)}.`
      : undefined;
  const set = (k: keyof LimitValues, v: string) => setValues((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-4">
      <Section
        title="Limites"
        description="Diminuir um limite vale na hora. Aumentar ou remover só vale 24 horas depois, para evitar decisão no calor do momento. Deixe vazio para não ter limite."
      >
        {limits.isLoading ? (
          <div className="skeleton h-56 rounded-[10px]" />
        ) : (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              saveLimits.mutate();
            }}
          >
            {MONEY_LIMITS.map((m) => (
              <fieldset key={m.kind}>
                <legend className="mb-1 text-[15px] font-semibold">{m.label}</legend>
                <p className="mb-3 text-[12.5px] text-muted-foreground">{m.hint}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {PERIODS.map((pr) => {
                    const key = `${m.kind}_${pr.id}` as MoneyKey;
                    return (
                      <Field
                        key={key}
                        label={pr.label}
                        htmlFor={`lim-${key}`}
                        hint={pendingHint(key)}
                      >
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
                          <input
                            id={`lim-${key}`}
                            className="field-input num pl-10"
                            inputMode="decimal"
                            placeholder="Sem limite"
                            value={values[key]}
                            onChange={(e) => set(key, e.target.value.replace(/[^\d,]/g, ""))}
                          />
                        </div>
                      </Field>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <fieldset>
              <legend className="mb-3 text-[15px] font-semibold">Tempo e quantidade</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Apostas por dia"
                  htmlFor="lim-bets"
                  hint={
                    pendingHint("bets_daily", false) ?? "Rodadas de cassino e bilhetes de esporte."
                  }
                >
                  <input
                    id="lim-bets"
                    className="field-input num"
                    inputMode="numeric"
                    placeholder="Sem limite"
                    value={values.bets_daily}
                    onChange={(e) =>
                      set("bets_daily", e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </Field>
                <Field
                  label="Tempo máximo de sessão"
                  htmlFor="lim-session"
                  hint={
                    pendingHint("session_minutes", false) ??
                    "Em minutos. Passou disso, as apostas param até você descansar 30 minutos."
                  }
                >
                  <input
                    id="lim-session"
                    className="field-input num"
                    inputMode="numeric"
                    placeholder="Sem limite"
                    value={values.session_minutes}
                    onChange={(e) =>
                      set("session_minutes", e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                  />
                </Field>
                <Field
                  label="Aviso de tempo jogando"
                  htmlFor="lim-alert"
                  hint="Mostramos o tempo de sessão e o resultado do dia nesse intervalo."
                >
                  <select
                    id="lim-alert"
                    className="field-input"
                    value={values.session_alert_minutes}
                    onChange={(e) => set("session_alert_minutes", e.target.value)}
                  >
                    {ALERTS.map((a) => (
                      <option key={a} value={a}>
                        A cada {ALERT_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </fieldset>

            <Button
              type="submit"
              disabled={saveLimits.isPending}
              className="h-11 rounded-[10px] px-6 font-bold shadow-none"
            >
              {saveLimits.isPending ? <Loader2 className="animate-spin" /> : "Salvar limites"}
            </Button>
          </form>
        )}
      </Section>

      <Section
        title="Pausa"
        description="Uma folga curta: você continua entrando e sacando, mas não aposta nem deposita durante o período. Dá para encerrar antes, com 24 horas de espera."
      >
        {pausedUntil ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14.5px]">
              Pausa ativa até{" "}
              <strong className="num font-semibold">{formatDateTime(pausedUntil)}</strong>.
            </p>
            <Button
              variant="secondary"
              disabled={doEndPause.isPending}
              onClick={() => doEndPause.mutate()}
              className="h-11 rounded-[10px] px-5 shadow-none"
            >
              {doEndPause.isPending ? <Loader2 className="animate-spin" /> : "Encerrar a pausa"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Duração" htmlFor="pause-days">
              <select
                id="pause-days"
                className="field-input sm:w-56"
                value={pauseDays}
                onChange={(e) => setPauseDays(Number(e.target.value) as typeof pauseDays)}
              >
                <option value={1}>24 horas</option>
                <option value={3}>3 dias</option>
                <option value={7}>7 dias</option>
                <option value={14}>14 dias</option>
                <option value={30}>30 dias</option>
              </select>
            </Field>
            <Button
              variant="secondary"
              disabled={doPause.isPending || !!excludedUntil}
              onClick={() => doPause.mutate()}
              className="h-12 rounded-[10px] px-5 font-bold shadow-none"
            >
              {doPause.isPending ? <Loader2 className="animate-spin" /> : "Fazer uma pausa"}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title="Autoexclusão"
        description="Bloqueia apostas e depósitos pelo período escolhido. Não dá para desfazer antes do fim, nem pelo suporte. Saques continuam liberados."
      >
        {excludedUntil ? (
          <p className="rounded-[10px] border border-destructive/40 bg-destructive/10 p-4 text-[14.5px]">
            Sua autoexclusão está ativa até <strong>{formatDate(excludedUntil)}</strong>.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Período" htmlFor="ex-days">
              <select
                id="ex-days"
                className="field-input sm:w-56"
                value={days}
                onChange={(e) => setDays(Number(e.target.value) as typeof days)}
              >
                <option value={1}>24 horas</option>
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>3 meses</option>
                <option value={180}>6 meses</option>
                <option value={365}>1 ano</option>
                <option value={3650}>Permanente</option>
              </select>
            </Field>
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              className="h-12 rounded-[10px] px-5 font-bold shadow-none"
            >
              Ativar autoexclusão
            </Button>
          </div>
        )}
        <p className="mt-4 text-[13.5px] text-muted-foreground">
          Quer se bloquear em todas as casas de apostas autorizadas de uma vez? Use a{" "}
          <a
            href={SPA_SELF_EXCLUSION}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary underline"
          >
            autoexclusão centralizada do governo <ExternalLink className="size-3.5" />
          </a>
          , com a conta gov.br.
        </p>
      </Section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[16px] border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[24px]">Ativar autoexclusão?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14.5px]">
              Durante{" "}
              {days === 3650 ? "tempo indeterminado" : days === 1 ? "24 horas" : `${days} dias`}{" "}
              você não vai conseguir apostar nem depositar. Isso não pode ser cancelado antes do
              fim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px]">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doExclude.mutate();
              }}
              className="rounded-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {doExclude.isPending ? <Loader2 className="animate-spin" /> : "Ativar agora"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
