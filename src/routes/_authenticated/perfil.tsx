import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
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
import { useProfile, useWallet } from "@/hooks/use-account";
import { useAuth } from "@/hooks/use-auth";
import { maskCPF, maskPhone } from "@/lib/validations";
import { formatBRL, formatDate, formatDateTime, parseBRL } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";

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
  useEffect(() => {
    if (!p) return;
    setUsername(p.username ?? "");
    setPhone(maskPhone(p.phone ?? ""));
  }, [p]);

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

function Security() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { signOut } = useAuth();

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("Use 8 caracteres ou mais, com letras e números.");
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
        title="Aparelhos conectados"
        description="Encerra o acesso em todos os celulares e computadores onde você entrou, inclusive este."
      >
        <Button
          variant="secondary"
          onClick={signOutEverywhere}
          className="h-11 rounded-[10px] px-5 shadow-none"
        >
          Sair de todos os aparelhos
        </Button>
      </Section>
    </div>
  );
}

const LIMIT_FIELDS = [
  { key: "deposit_daily", label: "Depósito por dia" },
  { key: "deposit_weekly", label: "Depósito por semana" },
  { key: "deposit_monthly", label: "Depósito por mês" },
  {
    key: "loss_daily",
    label: "Perda por dia",
    hint: "Apostas menos ganhos, somando cassino e esportes.",
  },
] as const;

type LimitKey = (typeof LIMIT_FIELDS)[number]["key"];

function Limits() {
  const fetchLimits = useServerFn(getMyLimits);
  const save = useServerFn(setMyLimits);
  const exclude = useServerFn(selfExclude);
  const wallet = useWallet();
  const qc = useQueryClient();
  const limits = useQuery({ queryKey: ["rg-limits"], queryFn: () => fetchLimits() });
  const [values, setValues] = useState<Record<LimitKey | "session_minutes", string>>({
    deposit_daily: "",
    deposit_weekly: "",
    deposit_monthly: "",
    loss_daily: "",
    session_minutes: "",
  });
  const [days, setDays] = useState<1 | 7 | 30 | 90 | 180 | 365 | 3650>(30);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const l = limits.data;
    if (!l) return;
    const fmt = (n: number | null) =>
      n === null || n === undefined ? "" : String(n).replace(".", ",");
    setValues({
      deposit_daily: fmt(l.deposit_daily),
      deposit_weekly: fmt(l.deposit_weekly),
      deposit_monthly: fmt(l.deposit_monthly),
      loss_daily: fmt(l.loss_daily),
      session_minutes: l.session_minutes ? String(l.session_minutes) : "",
    });
  }, [limits.data]);

  const saveLimits = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() ? parseBRL(v) : null);
      return save({
        data: {
          deposit_daily: n(values.deposit_daily),
          deposit_weekly: n(values.deposit_weekly),
          deposit_monthly: n(values.deposit_monthly),
          loss_daily: n(values.loss_daily),
          session_minutes: values.session_minutes ? Number(values.session_minutes) : null,
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
      qc.invalidateQueries({ queryKey: ["rg-limits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doExclude = useMutation({
    mutationFn: () => exclude({ data: { days, reason: "" } }),
    onSuccess: (r) => {
      toast.success(`Autoexclusão ativa até ${formatDate(r.until)}.`);
      qc.invalidateQueries({ queryKey: ["rg-limits"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      setConfirmOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = limits.data?.pending as Record<string, number | null> | null | undefined;
  const excludedUntil = wallet.data?.selfExcludedUntil;

  return (
    <div className="space-y-4">
      <Section
        title="Limites"
        description="Diminuir um limite vale na hora. Aumentar ou remover só vale 24 horas depois, para evitar decisão no calor do momento."
      >
        {limits.isLoading ? (
          <div className="skeleton h-40 rounded-[10px]" />
        ) : (
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveLimits.mutate();
            }}
          >
            {LIMIT_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                htmlFor={`lim-${f.key}`}
                hint={
                  pending && f.key in pending
                    ? `Muda para ${pending[f.key] === null ? "sem limite" : formatBRL(pending[f.key])} em ${formatDateTime(limits.data?.pending_effective_at)}.`
                    : "hint" in f
                      ? f.hint
                      : "Deixe vazio para não ter limite."
                }
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <input
                    id={`lim-${f.key}`}
                    className="field-input num pl-10"
                    inputMode="decimal"
                    placeholder="Sem limite"
                    value={values[f.key]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value.replace(/[^\d,]/g, "") }))
                    }
                  />
                </div>
              </Field>
            ))}
            <Field
              label="Aviso de tempo de sessão"
              htmlFor="lim-session"
              hint="Em minutos. Avisamos quando o tempo jogando passar disso."
            >
              <input
                id="lim-session"
                className="field-input num"
                inputMode="numeric"
                placeholder="Sem aviso"
                value={values.session_minutes}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    session_minutes: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={saveLimits.isPending}
                className="h-11 rounded-[10px] px-6 font-bold shadow-none"
              >
                {saveLimits.isPending ? <Loader2 className="animate-spin" /> : "Salvar limites"}
              </Button>
            </div>
          </form>
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
