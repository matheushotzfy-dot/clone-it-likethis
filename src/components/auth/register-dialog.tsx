import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "./auth-dialog-context";
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, Check, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { maskCPF, maskPhone, validateCPF, EMAIL_DOMAINS } from "@/lib/validations";
import { getTrackingMetadata } from "@/lib/tracking";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<"cpf" | "email" | "phone" | "password" | "accept", string>>;

/** Simple, explicit strength scoring — 0..3. */
function scorePassword(pw: string) {
  if (pw.length < 6) return 0;
  let score = 1;
  if (pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw)) score = 2;
  if (pw.length >= 10 && /[^a-zA-Z0-9]/.test(pw)) score = 3;
  return score;
}

const strengthMeta = [
  { label: "Muito curta", color: "bg-destructive" },
  { label: "Fraca", color: "bg-destructive" },
  { label: "Boa", color: "bg-hot" },
  { label: "Forte", color: "bg-success" },
] as const;

const inputBase =
  "h-12 w-full rounded-lg border bg-background/50 pl-11 pr-3 text-base font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none";

export function RegisterDialog() {
  const { current, close, open } = useAuthDialog();
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showEmailHints, setShowEmailHints] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emailRef.current && !emailRef.current.contains(event.target as Node)) {
        setShowEmailHints(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const strength = scorePassword(password);
  const filled = useMemo(
    () => [cpf.replace(/\D/g, "").length === 11, email.includes("@"), phone.replace(/\D/g, "").length >= 10, password.length >= 6].filter(Boolean).length,
    [cpf, email, phone, password],
  );

  function handleEmailChange(val: string) {
    setEmail(val);
    setErrors((e) => ({ ...e, email: undefined }));
    if (val.includes("@")) {
      const parts = val.split("@");
      setShowEmailHints((parts[1] ?? "").length < 3);
    } else {
      setShowEmailHints(false);
    }
  }

  function selectHint(domain: string) {
    const prefix = email.split("@")[0];
    setEmail(`${prefix}@${domain}`);
    setShowEmailHints(false);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!validateCPF(cpf)) next.cpf = "Informe um CPF válido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = "Informe um e-mail válido.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Informe o DDD + número.";
    if (password.length < 6) next.password = "Use no mínimo 6 caracteres.";
    if (!accept) next.accept = "Você precisa aceitar os termos.";
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const tracking = getTrackingMetadata();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, ""),
          ...tracking,
        },
      },
    });

    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      let friendly = error.message;
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        friendly = "Este email já está cadastrado. Faça login.";
        setErrors({ email: friendly });
      } else if (msg.includes("weak") || msg.includes("pwned") || msg.includes("compromised")) {
        friendly = "Senha muito fraca ou vazada. Use uma senha mais forte.";
        setErrors({ password: friendly });
      } else if (msg.includes("invalid") && msg.includes("email")) {
        friendly = "Email inválido. Verifique e tente novamente.";
        setErrors({ email: friendly });
      } else if (msg.includes("rate") || msg.includes("limit")) {
        friendly = "Muitas tentativas. Aguarde alguns segundos.";
      }
      toast.error(friendly);
      return;
    }

    toast.success("Conta criada! Bem-vindo.");
    open("deposit");
  }

  const fieldClass = (hasError?: string) =>
    cn(inputBase, hasError ? "border-destructive" : "border-border focus:border-primary");

  return (
    <Dialog open={current === "register"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden border-border bg-background p-0 sm:max-h-[94vh] sm:w-[calc(100vw-2rem)] sm:max-w-[460px] sm:rounded-lg">
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-6 md:px-8 md:py-8">
          <div className="mb-5 flex items-start justify-between gap-3 pr-8">
            <span className="font-display shrink-0 text-xl font-extrabold md:text-2xl">
              aposta<span className="text-primary">maxy</span>
            </span>
            <div className="min-w-0 text-right text-xs">
              <p className="text-muted-foreground">Já tem conta?</p>
              <Button variant="ghost" onClick={() => open("login")} className="font-bold text-primary hover:underline">
                Entrar
              </Button>
            </div>
          </div>

          <div className="mb-5">
            <DialogTitle className="font-display text-2xl font-extrabold leading-tight">
              Crie sua conta em 1 minuto
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Cadastro rápido, depósito e saque por PIX.
            </DialogDescription>
          </div>

          {/* progress */}
          <div className="mb-5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <progress value={filled} max={4} aria-label="Progresso do cadastro" className="registration-progress block h-full w-full" />
            </div>
            <span className="text-[10px] font-extrabold tracking-normal text-muted-foreground">
              {filled}/4
            </span>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="CPF" error={errors.cpf}>
              <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <input
                value={cpf}
                onChange={(e) => { setCpf(maskCPF(e.target.value)); setErrors((x) => ({ ...x, cpf: undefined })); }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={!!errors.cpf}
                className={fieldClass(errors.cpf)}
              />
            </Field>

            <div ref={emailRef}>
              <Field label="E-mail" error={errors.email}>
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="voce@email.com"
                  aria-invalid={!!errors.email}
                  className={fieldClass(errors.email)}
                />
                {showEmailHints && (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                    {EMAIL_DOMAINS.map((domain) => (
                      <Button variant="ghost"
                        key={domain}
                        type="button"
                        onClick={() => selectHint(domain)}
                        className="w-full border-b border-border/60 px-4 py-2.5 text-left text-sm font-semibold last:border-0 hover:bg-surface"
                      >
                        @{domain}
                      </Button>
                    ))}
                  </div>
                )}
              </Field>
            </div>

            <Field label="Celular" error={errors.phone}>
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <input
                value={phone}
                onChange={(e) => { setPhone(maskPhone(e.target.value)); setErrors((x) => ({ ...x, phone: undefined })); }}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                className={fieldClass(errors.phone)}
              />
            </Field>

            <Field label="Senha" error={errors.password}>
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })); }}
                placeholder="Mínimo 6 caracteres"
                aria-invalid={!!errors.password}
                className={cn(fieldClass(errors.password), "pr-11")}
              />
              <Button variant="ghost"
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </Field>

            {password.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i < strength ? strengthMeta[strength].color : "bg-surface",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold tracking-normal text-muted-foreground">
                  {strengthMeta[strength].label}
                </span>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={accept}
                  onChange={(e) => { setAccept(e.target.checked); setErrors((x) => ({ ...x, accept: undefined })); }}
                  className="size-[18px] cursor-pointer appearance-none rounded-md border border-border bg-background/60 transition-all checked:border-primary checked:bg-primary"
                />
                {accept && (
                  <Check className="pointer-events-none absolute inset-0 m-auto size-3 text-primary-foreground" strokeWidth={4} />
                )}
              </span>
              <span className="leading-normal">
                Declaro ter mais de 18 anos e aceitar os{" "}
                <span className="font-bold text-primary">Termos</span> e a{" "}
                <span className="font-bold text-primary">Política de Privacidade</span>.
              </span>
            </label>
            {errors.accept && <p className="text-[11px] font-semibold text-destructive">{errors.accept}</p>}

            <Button variant="ghost"
              type="submit"
              disabled={loading}
              className="cta-glow slick mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-extrabold tracking-normal text-primary-foreground disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" strokeWidth={2.5} />}
              {loading ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" strokeWidth={2.25} />
            Dados protegidos com criptografia · LGPD · 18+
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, error, children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-0.5 text-[11px] font-extrabold tracking-normal text-muted-foreground">
        {label}
      </label>
      <div className="relative">{children}</div>
      {error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}
    </div>
  );
}
