import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signIn } from "@/lib/auth.functions";
import { maskCPF } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { useAuthDialog } from "./auth-dialog-context";
import { AuthSheet, Field } from "./auth-sheet";

function looksLikeCpf(value: string) {
  return !value.includes("@") && value.replace(/\D/g, "").length === 11;
}

function lastAccessText(iso: string | null) {
  if (!iso) return "Este é o seu primeiro acesso.";
  const d = new Date(iso);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...o }).format(d);
  return `Último acesso em ${fmt({ day: "2-digit", month: "2-digit", year: "numeric" })} às ${fmt({ hour: "2-digit", minute: "2-digit" })}.`;
}

/** Aviso de risco exibido em toda entrada (Portaria SPA/MF 1.231, art. 4º). */
export function RiskNotice({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-[12.5px] leading-relaxed text-muted-foreground"}>
      Apostar envolve risco de perda de dinheiro e pode causar dependência. Jogue com moderação,
      defina limites e não aposte para recuperar perdas. Proibido para menores de 18 anos.
    </p>
  );
}

export function LoginDialog() {
  const { current, close, open } = useAuthDialog();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [locked, setLocked] = useState(false);
  const login = useServerFn(signIn);

  function onIdentifier(val: string) {
    setError(null);
    const digits = val.replace(/\D/g, "");
    setIdentifier(
      !val.includes("@") && !/[a-zA-Z]/.test(val) && digits.length > 0 && digits.length <= 11
        ? maskCPF(val)
        : val,
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Preencha e-mail ou CPF e a senha.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const id = looksLikeCpf(identifier) ? identifier.replace(/\D/g, "") : identifier.trim();
      const res = await login({ data: { identifier: id, password } });
      if (!res.ok) {
        setError(res.error);
        setLocked(!!res.locked);
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (sessionError) {
        setError("Não foi possível entrar. Tente de novo.");
        return;
      }
      setPassword("");
      setLocked(false);
      close();
      toast.success("Você entrou na sua conta.", {
        description: `${lastAccessText(res.previousLoginAt)} Apostar envolve risco: jogue com limites.`,
        duration: 7000,
      });
    } catch {
      setError("Não foi possível entrar agora. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  }

  async function forgot() {
    const email = identifier.trim();
    if (!email.includes("@")) {
      setError("Para recuperar a senha, digite o e-mail da conta no primeiro campo.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/perfil?aba=seguranca`,
    });
    setLoading(false);
    if (resetError) {
      setError("Não foi possível enviar o e-mail agora. Tente em instantes.");
      return;
    }
    setResetSent(true);
  }

  return (
    <AuthSheet
      open={current === "login"}
      onOpenChange={(o) => {
        if (!o) {
          close();
          setResetSent(false);
          setError(null);
          setLocked(false);
        }
      }}
      title="Entrar"
      description={
        <>
          Ainda não tem conta?{" "}
          <button
            type="button"
            onClick={() => open("register")}
            className="font-semibold text-primary hover:underline"
          >
            Criar conta
          </button>
        </>
      }
      width={420}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="E-mail ou CPF" htmlFor="login-id">
          <input
            id="login-id"
            className="field-input"
            value={identifier}
            onChange={(e) => onIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="voce@email.com ou 000.000.000-00"
            autoFocus
          />
        </Field>
        <Field label="Senha" htmlFor="login-pass">
          <div className="relative">
            <input
              id="login-pass"
              type={show ? "text" : "password"}
              className="field-input pr-12"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
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
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-[8px] border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13.5px]"
          >
            {error}
          </p>
        )}
        {resetSent && (
          <p
            role="status"
            className="rounded-[8px] border border-pix/40 bg-pix/10 px-3 py-2.5 text-[13.5px]"
          >
            Enviamos um link para {identifier.trim()}. Abra o e-mail para criar uma nova senha.
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[10px] text-[16px] font-bold shadow-none"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
        </Button>
        <button
          type="button"
          onClick={forgot}
          className={
            locked
              ? "block w-full rounded-[10px] border border-border py-2.5 text-center text-[14px] font-semibold hover:bg-surface"
              : "block w-full text-center text-[14px] font-medium text-muted-foreground hover:text-foreground"
          }
        >
          {locked ? "Criar nova senha pelo e-mail" : "Esqueci minha senha"}
        </button>
        <RiskNotice />
      </form>
    </AuthSheet>
  );
}
