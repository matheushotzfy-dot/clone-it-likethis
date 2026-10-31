import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { resolveEmailFromCpf } from "@/lib/auth.functions";
import { useAuthDialog } from "./auth-dialog-context";
import { User, Lock, Eye, EyeOff, ShieldCheck, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { maskCPF } from "@/lib/validations";
import { cn } from "@/lib/utils";

function isLikelyCpf(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length === 11 && !input.includes("@");
}

const inputBase =
  "h-12 w-full rounded-lg border border-border bg-background/50 pl-11 pr-3 text-base font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none";

export function LoginDialog() {
  const { current, close, open } = useAuthDialog();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const resolveCpf = useServerFn(resolveEmailFromCpf);

  function handleIdentifierChange(val: string) {
    const onlyDigits = val.replace(/\D/g, "");
    if (!val.includes("@") && onlyDigits.length > 0 && onlyDigits.length <= 11 && !/[a-zA-Z]/.test(val)) {
      setIdentifier(maskCPF(val));
    } else {
      setIdentifier(val);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let emailToUse = identifier.trim();

      if (isLikelyCpf(emailToUse)) {
        const digits = emailToUse.replace(/\D/g, "");
        const { email } = await resolveCpf({ data: { cpf: digits } });
        if (!email) {
          toast.error("CPF ou senha incorretos");
          return;
        }
        emailToUse = email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (error) {
        toast.error(
          error.message === "Invalid login credentials" ? "Email/CPF ou senha incorretos" : error.message,
        );
        return;
      }
      toast.success("Bem-vindo!");
      close();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={current === "login"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="auth-sheet max-h-[94dvh] w-[calc(100vw-1.5rem)] max-w-[420px] gap-0 overflow-hidden border-border bg-background p-0 sm:rounded-lg">
        <div className="auth-sheet-scroll surface-grad relative min-h-0 overflow-y-auto px-6 pb-7 pt-7 sm:px-8">

          <div className="relative mb-6 flex flex-col items-center text-center">
            <span className="font-display text-3xl font-extrabold leading-none tracking-normal">
              aposta<span className="text-primary">maxy</span>
            </span>
          </div>

          <DialogTitle className="font-display text-xl font-extrabold">Entrar na conta</DialogTitle>
          <DialogDescription className="mb-5 mt-1 text-sm text-muted-foreground">
            Use seu e-mail ou CPF e senha.
          </DialogDescription>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="E-mail ou CPF"
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                required
                className={inputBase}
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn(inputBase, "pr-11")}
              />
              <Button variant="ghost"
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>

            <Button variant="ghost"
              type="submit"
              disabled={loading}
              className="cta-glow slick flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-extrabold tracking-normal text-primary-foreground disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" strokeWidth={2.5} />}
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <Button variant="ghost"
            type="button"
            className="mx-auto mt-4 block text-sm font-bold text-primary hover:underline"
          >
            Esqueci minha senha
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Button variant="ghost" onClick={() => open("register")} className="font-bold text-primary hover:underline">
              Cadastre-se
            </Button>
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" strokeWidth={2.25} />
            Conexão segura · 18+
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
