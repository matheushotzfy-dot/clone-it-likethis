import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkSignup, signupErrorMessage } from "@/lib/auth.functions";
import { maskCPF, maskPhone, validateCPF } from "@/lib/validations";
import { getTrackingMetadata } from "@/lib/tracking";
import { usePublicSettings } from "@/hooks/use-account";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthDialog } from "./auth-dialog-context";
import { AuthSheet, Field } from "./auth-sheet";

type Errors = Partial<
  Record<"name" | "cpf" | "birth" | "email" | "phone" | "password" | "accept" | "form", string>
>;

function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** DD/MM/AAAA -> AAAA-MM-DD, ou null se a data não existe. */
function toIsoDate(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
  if (
    date.getUTCFullYear() !== +yyyy ||
    date.getUTCMonth() !== +mm - 1 ||
    date.getUTCDate() !== +dd
  )
    return null;
  return `${yyyy}-${mm}-${dd}`;
}

function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: "8 caracteres ou mais" },
    { ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw), label: "Letras e números" },
  ];
}

export function RegisterDialog() {
  const { current, close, open } = useAuthDialog();
  const settings = usePublicSettings();
  const precheck = useServerFn(checkSignup);

  const [step, setStep] = useState<1 | 2 | "done">(1);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const checks = useMemo(() => passwordChecks(password), [password]);

  function reset() {
    setStep(1);
    setName("");
    setCpf("");
    setBirth("");
    setEmail("");
    setPhone("");
    setPassword("");
    setAccept(false);
    setErrors({});
  }

  async function nextStep(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2 || parts.some((p) => p.length < 2))
      next.name = "Escreva nome e sobrenome, como no documento.";
    if (!validateCPF(cpf)) next.cpf = "Este CPF não é válido.";
    const iso = toIsoDate(birth);
    if (!iso) next.birth = "Use o formato DD/MM/AAAA.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await precheck({ data: { cpf: cpf.replace(/\D/g, ""), birthDate: iso! } });
      if (!res.ok) {
        setErrors({ cpf: res.errors.cpf, birth: res.errors.birthDate, form: res.errors.form });
        return;
      }
      setStep(2);
    } catch {
      setErrors({ form: "Não foi possível conferir seus dados agora. Tente de novo." });
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = "Confira o e-mail.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Informe DDD e número.";
    if (!checks.every((c) => c.ok)) next.password = "A senha precisa cumprir os dois requisitos.";
    if (!accept) next.accept = "Confirme que tem 18 anos ou mais e aceita os termos.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: name.trim().replace(/\s+/g, " "),
          cpf: cpf.replace(/\D/g, ""),
          birth_date: toIsoDate(birth),
          phone: phone.replace(/\D/g, ""),
          ...getTrackingMetadata(),
        },
      },
    });
    setLoading(false);
    if (error) {
      const msg = signupErrorMessage(error.message);
      setErrors(
        msg.includes("e-mail")
          ? { email: msg }
          : msg.includes("senha")
            ? { password: msg }
            : { form: msg },
      );
      return;
    }
    if (!data.session) {
      setStep("done");
      return;
    }
    toast.success("Conta criada. Boas-vindas à apostamaxy!");
    reset();
    if (settings.data?.realMoney) open("deposit");
    else close();
  }

  const titles = { 1: "Criar conta", 2: "Dados de acesso", done: "Confirme seu e-mail" } as const;

  return (
    <AuthSheet
      open={current === "register"}
      onOpenChange={(o) => {
        if (!o) {
          close();
          if (step === "done") reset();
        }
      }}
      title={titles[step]}
      width={460}
      description={
        step === "done" ? undefined : (
          <>
            Passo {step} de 2. Já tem conta?{" "}
            <button
              type="button"
              onClick={() => open("login")}
              className="font-semibold text-primary hover:underline"
            >
              Entrar
            </button>
          </>
        )
      }
    >
      {step !== "done" && (
        <div className="mb-6 grid grid-cols-2 gap-1.5" aria-hidden>
          <span className="h-1 rounded-full bg-primary" />
          <span className={cn("h-1 rounded-full", step === 2 ? "bg-primary" : "bg-surface-2")} />
        </div>
      )}

      {settings.data && !settings.data.signup && step === 1 && (
        <p className="mb-4 rounded-[8px] border border-border bg-surface px-3 py-2.5 text-[14px]">
          Novos cadastros estão fechados no momento.
        </p>
      )}

      {step === 1 && (
        <form onSubmit={nextStep} className="space-y-4" noValidate>
          <Field label="Nome completo" htmlFor="rg-name" error={errors.name}>
            <input
              id="rg-name"
              className="field-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({});
              }}
              autoComplete="name"
              aria-invalid={!!errors.name}
              autoFocus
            />
          </Field>
          <Field
            label="CPF"
            htmlFor="rg-cpf"
            error={errors.cpf}
            hint="Os saques vão para a chave Pix deste CPF."
          >
            <input
              id="rg-cpf"
              className="field-input num"
              value={cpf}
              onChange={(e) => {
                setCpf(maskCPF(e.target.value));
                setErrors({});
              }}
              inputMode="numeric"
              placeholder="000.000.000-00"
              aria-invalid={!!errors.cpf}
            />
          </Field>
          <Field label="Data de nascimento" htmlFor="rg-birth" error={errors.birth}>
            <input
              id="rg-birth"
              className="field-input num"
              value={birth}
              onChange={(e) => {
                setBirth(maskDate(e.target.value));
                setErrors({});
              }}
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              autoComplete="bday"
              aria-invalid={!!errors.birth}
            />
          </Field>
          {errors.form && (
            <p
              role="alert"
              className="rounded-[8px] border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13.5px]"
            >
              {errors.form}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-[10px] text-[16px] font-bold shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Continuar"}
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="E-mail" htmlFor="rg-email" error={errors.email}>
            <input
              id="rg-email"
              type="email"
              inputMode="email"
              className="field-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({});
              }}
              autoComplete="email"
              placeholder="voce@email.com"
              aria-invalid={!!errors.email}
              autoFocus
            />
          </Field>
          <Field label="Celular" htmlFor="rg-phone" error={errors.phone}>
            <input
              id="rg-phone"
              className="field-input num"
              value={phone}
              onChange={(e) => {
                setPhone(maskPhone(e.target.value));
                setErrors({});
              }}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              aria-invalid={!!errors.phone}
            />
          </Field>
          <Field label="Senha" htmlFor="rg-pass" error={errors.password}>
            <div className="relative">
              <input
                id="rg-pass"
                type={show ? "text" : "password"}
                className="field-input pr-12"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({});
                }}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={cn(
                    "flex items-center gap-1.5 text-[12.5px]",
                    c.ok ? "text-live" : "text-muted-foreground",
                  )}
                >
                  <Check className={cn("size-3.5", !c.ok && "opacity-30")} /> {c.label}
                </li>
              ))}
            </ul>
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-surface p-3 text-[13.5px] leading-snug">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => {
                setAccept(e.target.checked);
                setErrors({});
              }}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--primary)]"
            />
            <span>
              Tenho 18 anos ou mais e aceito os{" "}
              <a
                href="/legal/termos"
                target="_blank"
                className="font-semibold text-primary hover:underline"
              >
                Termos de uso
              </a>{" "}
              e a{" "}
              <a
                href="/legal/privacidade"
                target="_blank"
                className="font-semibold text-primary hover:underline"
              >
                Política de privacidade
              </a>
              .
            </span>
          </label>
          {errors.accept && (
            <p role="alert" className="text-[13px] text-destructive">
              {errors.accept}
            </p>
          )}
          {errors.form && (
            <p
              role="alert"
              className="rounded-[8px] border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13.5px]"
            >
              {errors.form}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep(1);
                setErrors({});
              }}
              className="h-12 rounded-[10px] px-4 shadow-none"
              aria-label="Voltar ao passo 1"
            >
              <ArrowLeft />
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 rounded-[10px] text-[16px] font-bold shadow-none"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Criar conta"}
            </Button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-pix/15 text-pix">
            <MailCheck className="size-7" />
          </span>
          <p className="text-[15px]">
            Enviamos um link de confirmação para{" "}
            <strong className="font-semibold">{email.trim()}</strong>. Abra o e-mail para ativar a
            conta e depois entre normalmente.
          </p>
          <Button
            variant="secondary"
            className="h-11 w-full rounded-[10px] shadow-none"
            onClick={() => {
              reset();
              open("login");
            }}
          >
            Ir para o login
          </Button>
        </div>
      )}
    </AuthSheet>
  );
}
