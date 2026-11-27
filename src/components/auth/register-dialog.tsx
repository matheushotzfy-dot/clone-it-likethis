import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkSignup, signUp, UFS } from "@/lib/auth.functions";
import { passwordChecks, passwordOk } from "@/lib/password-policy";
import { maskCPF, maskPhone, validateCPF } from "@/lib/validations";
import { getTrackingMetadata } from "@/lib/tracking";
import { usePublicSettings } from "@/hooks/use-account";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthDialog } from "./auth-dialog-context";
import { AuthSheet, Field } from "./auth-sheet";
import { RiskNotice } from "./login-dialog";

type Step = 1 | 2 | 3 | "done";
type Errors = Partial<
  Record<
    | "name"
    | "cpf"
    | "birth"
    | "nationality"
    | "zip"
    | "street"
    | "number"
    | "city"
    | "state"
    | "email"
    | "phone"
    | "password"
    | "accept"
    | "consent"
    | "form",
    string
  >
>;

export const NATIONALITIES = [
  "Brasileira",
  "Brasileira naturalizada",
  "Estrangeira residente no Brasil",
] as const;

function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
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

export type Address = {
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};
export const EMPTY_ADDRESS: Address = {
  zip: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

/** Busca o endereço pelo CEP na ViaCEP (consulta pública, direto do navegador). */
export async function lookupCep(cep: string): Promise<Partial<Address> | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (j.erro) return null;
    return {
      street: j.logradouro ?? "",
      district: j.bairro ?? "",
      city: j.localidade ?? "",
      state: j.uf ?? "",
    };
  } catch {
    return null;
  }
}

export function addressErrors(a: Address): Errors {
  const e: Errors = {};
  if (a.zip.replace(/\D/g, "").length !== 8) e.zip = "CEP com 8 números.";
  if (a.street.trim().length < 2) e.street = "Informe a rua.";
  if (!a.number.trim()) e.number = "Informe o número ou S/N.";
  if (a.city.trim().length < 2) e.city = "Informe a cidade.";
  if (!(UFS as readonly string[]).includes(a.state)) e.state = "Escolha o estado.";
  return e;
}

/** Campos de endereço com busca por CEP (cadastro e perfil). */
export function AddressFields({
  value,
  onChange,
  errors,
  idPrefix,
}: {
  value: Address;
  onChange: (a: Address) => void;
  errors: Errors;
  idPrefix: string;
}) {
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });

  async function onZip(raw: string) {
    const masked = maskCep(raw);
    const next = { ...value, zip: masked };
    onChange(next);
    setNotFound(false);
    if (masked.replace(/\D/g, "").length === 8) {
      setLooking(true);
      const found = await lookupCep(masked);
      setLooking(false);
      if (found)
        onChange({ ...next, ...Object.fromEntries(Object.entries(found).filter(([, v]) => v)) });
      else setNotFound(true);
    }
  }

  return (
    <div className="grid grid-cols-6 gap-x-3 gap-y-4">
      <div className="col-span-6 sm:col-span-3">
        <Field
          label="CEP"
          htmlFor={`${idPrefix}-zip`}
          error={errors.zip}
          hint={notFound ? "CEP não encontrado. Preencha o endereço à mão." : undefined}
        >
          <div className="relative">
            <input
              id={`${idPrefix}-zip`}
              className="field-input num"
              value={value.zip}
              onChange={(e) => void onZip(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              aria-invalid={!!errors.zip}
            />
            {looking && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </Field>
      </div>
      <div className="col-span-6 sm:col-span-3">
        <Field label="País" htmlFor={`${idPrefix}-country`}>
          <input id={`${idPrefix}-country`} className="field-input" value="Brasil" readOnly />
        </Field>
      </div>
      <div className="col-span-6 sm:col-span-4">
        <Field label="Rua" htmlFor={`${idPrefix}-street`} error={errors.street}>
          <input
            id={`${idPrefix}-street`}
            className="field-input"
            value={value.street}
            onChange={(e) => set("street", e.target.value)}
            autoComplete="address-line1"
            aria-invalid={!!errors.street}
          />
        </Field>
      </div>
      <div className="col-span-3 sm:col-span-2">
        <Field label="Número" htmlFor={`${idPrefix}-number`} error={errors.number}>
          <input
            id={`${idPrefix}-number`}
            className="field-input num"
            value={value.number}
            onChange={(e) => set("number", e.target.value.slice(0, 20))}
            aria-invalid={!!errors.number}
          />
        </Field>
      </div>
      <div className="col-span-3 sm:col-span-3">
        <Field label="Complemento" htmlFor={`${idPrefix}-comp`}>
          <input
            id={`${idPrefix}-comp`}
            className="field-input"
            value={value.complement}
            onChange={(e) => set("complement", e.target.value.slice(0, 80))}
            autoComplete="address-line2"
            placeholder="Opcional"
          />
        </Field>
      </div>
      <div className="col-span-6 sm:col-span-3">
        <Field label="Bairro" htmlFor={`${idPrefix}-district`}>
          <input
            id={`${idPrefix}-district`}
            className="field-input"
            value={value.district}
            onChange={(e) => set("district", e.target.value.slice(0, 80))}
          />
        </Field>
      </div>
      <div className="col-span-4">
        <Field label="Cidade" htmlFor={`${idPrefix}-city`} error={errors.city}>
          <input
            id={`${idPrefix}-city`}
            className="field-input"
            value={value.city}
            onChange={(e) => set("city", e.target.value.slice(0, 80))}
            autoComplete="address-level2"
            aria-invalid={!!errors.city}
          />
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="UF" htmlFor={`${idPrefix}-uf`} error={errors.state}>
          <select
            id={`${idPrefix}-uf`}
            className="field-input"
            value={value.state}
            onChange={(e) => set("state", e.target.value)}
            aria-invalid={!!errors.state}
          >
            <option value="">--</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

export function PasswordChecklist({ password }: { password: string }) {
  const checks = useMemo(() => passwordChecks(password), [password]);
  return (
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
  );
}

export function RegisterDialog() {
  const { current, close, open } = useAuthDialog();
  const settings = usePublicSettings();
  const precheck = useServerFn(checkSignup);
  const createAccount = useServerFn(signUp);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [nationality, setNationality] = useState<string>(NATIONALITIES[0]);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  function reset() {
    setStep(1);
    setName("");
    setCpf("");
    setBirth("");
    setNationality(NATIONALITIES[0]);
    setAddress(EMPTY_ADDRESS);
    setEmail("");
    setPhone("");
    setPassword("");
    setAccept(false);
    setConsent(false);
    setErrors({});
  }

  async function stepOne(e: React.FormEvent) {
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

  function stepTwo(e: React.FormEvent) {
    e.preventDefault();
    const next = addressErrors(address);
    setErrors(next);
    if (!Object.keys(next).length) setStep(3);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = "Confira o e-mail.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Informe DDD e número.";
    if (!passwordOk(password)) next.password = "A senha precisa cumprir os três requisitos.";
    if (!accept) next.accept = "Confirme que tem 18 anos ou mais e aceita os termos.";
    if (!consent) next.consent = "Autorize o uso dos dados para abrir e manter a conta.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await createAccount({
        data: {
          fullName: name.trim(),
          cpf: cpf.replace(/\D/g, ""),
          birthDate: toIsoDate(birth)!,
          nationality,
          email: email.trim().toLowerCase(),
          phone: phone.replace(/\D/g, ""),
          password,
          address: {
            zip: address.zip.replace(/\D/g, ""),
            street: address.street.trim(),
            number: address.number.trim(),
            complement: address.complement.trim(),
            district: address.district.trim(),
            city: address.city.trim(),
            state: address.state as (typeof UFS)[number],
          },
          acceptTerms: true,
          privacyConsent: true,
          tracking: getTrackingMetadata(),
        },
      });
      if (!res.ok) {
        if (res.field === "cpf") {
          setStep(1);
          setErrors({ cpf: res.error });
        } else
          setErrors(
            res.field === "email" || res.field === "password"
              ? { [res.field]: res.error }
              : { form: res.error },
          );
        return;
      }
      if (res.confirmEmail) {
        setStep("done");
        return;
      }
      await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      toast.success("Conta criada. Boas-vindas à apostamaxy!", {
        description: settings.data?.requireIdentity
          ? "Antes do primeiro depósito, verifique sua identidade."
          : undefined,
      });
      reset();
      if (settings.data?.requireIdentity) open("identity");
      else close();
    } catch {
      setErrors({ form: "Não foi possível criar a conta agora. Tente de novo em instantes." });
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    1: "Criar conta",
    2: "Endereço",
    3: "Dados de acesso",
    done: "Confirme seu e-mail",
  } as const;
  const clear = () => setErrors({});
  const back = (to: Step) => (
    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        setStep(to);
        clear();
      }}
      className="h-12 rounded-[10px] px-4 shadow-none"
      aria-label="Voltar"
    >
      <ArrowLeft />
    </Button>
  );
  const formError = errors.form && (
    <p
      role="alert"
      className="rounded-[8px] border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13.5px]"
    >
      {errors.form}
    </p>
  );

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
      width={480}
      description={
        step === "done" ? undefined : (
          <>
            Passo {step} de 3. Já tem conta?{" "}
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
        <div className="mb-6 grid grid-cols-3 gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn(
                "h-1 rounded-full",
                (step as number) >= n ? "bg-primary" : "bg-surface-2",
              )}
            />
          ))}
        </div>
      )}

      {settings.data && !settings.data.signup && step === 1 && (
        <p className="mb-4 rounded-[8px] border border-border bg-surface px-3 py-2.5 text-[14px]">
          Novos cadastros estão fechados no momento.
        </p>
      )}

      {step === 1 && (
        <form onSubmit={stepOne} className="space-y-4" noValidate>
          <Field label="Nome completo" htmlFor="rg-name" error={errors.name}>
            <input
              id="rg-name"
              className="field-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clear();
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
                clear();
              }}
              inputMode="numeric"
              placeholder="000.000.000-00"
              aria-invalid={!!errors.cpf}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nascimento" htmlFor="rg-birth" error={errors.birth}>
              <input
                id="rg-birth"
                className="field-input num"
                value={birth}
                onChange={(e) => {
                  setBirth(maskDate(e.target.value));
                  clear();
                }}
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                autoComplete="bday"
                aria-invalid={!!errors.birth}
              />
            </Field>
            <Field label="Nacionalidade" htmlFor="rg-nat">
              <select
                id="rg-nat"
                className="field-input"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              >
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {formError}
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
        <form onSubmit={stepTwo} className="space-y-5" noValidate>
          <p className="text-[13.5px] text-muted-foreground">
            O endereço de residência faz parte do cadastro exigido por lei. Digite o CEP para
            preencher o resto.
          </p>
          <AddressFields
            idPrefix="rg-addr"
            value={address}
            onChange={(a) => {
              setAddress(a);
              clear();
            }}
            errors={errors}
          />
          <div className="flex gap-2">
            {back(1)}
            <Button
              type="submit"
              className="h-12 flex-1 rounded-[10px] text-[16px] font-bold shadow-none"
            >
              Continuar
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
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
                clear();
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
                clear();
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
                  clear();
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
            <PasswordChecklist password={password} />
          </Field>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-surface p-3 text-[13.5px] leading-snug">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => {
                  setAccept(e.target.checked);
                  clear();
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
                  Termos de Uso
                </a>
                .
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-surface p-3 text-[13.5px] leading-snug">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  clear();
                }}
                className="mt-0.5 size-[18px] shrink-0 accent-[var(--primary)]"
              />
              <span>
                Autorizo o uso dos meus dados para abrir e manter a conta, verificar a identidade e
                cumprir a lei, como explica a{" "}
                <a
                  href="/legal/privacidade"
                  target="_blank"
                  className="font-semibold text-primary hover:underline"
                >
                  Política de Privacidade
                </a>
                .
              </span>
            </label>
            {(errors.accept || errors.consent) && (
              <p role="alert" className="text-[13px] text-destructive">
                {errors.accept ?? errors.consent}
              </p>
            )}
          </div>
          {formError}

          <div className="flex gap-2">
            {back(2)}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 rounded-[10px] text-[16px] font-bold shadow-none"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Criar conta"}
            </Button>
          </div>
          <RiskNotice />
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
