import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { resolveEmailFromCpf } from "@/lib/auth.functions";
import { useAuthDialog } from "./auth-dialog-context";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import shield from "@/assets/santos-shield.png";
import { maskCPF } from "@/lib/validations";

function isLikelyCpf(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length === 11 && !input.includes("@");
}

export function LoginDialog() {
  const { current, close, open } = useAuthDialog();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const resolveCpf = useServerFn(resolveEmailFromCpf);

  function handleIdentifierChange(val: string) {
    // If they're typing digits (no @), apply CPF mask for readability
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
        toast.error(error.message === "Invalid login credentials" ? "Email/CPF ou senha incorretos" : error.message);
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
      <DialogContent className="p-0 max-w-[420px] w-[calc(100vw-1rem)] bg-brand border-brand overflow-hidden gap-0 max-h-[92vh] sm:rounded-2xl">
        <div className="p-6 sm:p-8 bg-gradient-to-b from-brand-2 to-brand text-white overflow-y-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={shield}
              alt="Santos FC"
              width={80}
              height={98}
              className="size-16 sm:size-20 object-contain drop-shadow-2xl mb-3"
            />
            <span className="text-2xl font-black tracking-tight">
              <span className="text-white">SANTOS</span>
              <span className="text-primary">BET</span>
            </span>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] font-bold text-white/60">A Casa da Torcida</p>
          </div>

          <h2 className="text-xl font-bold mb-1">Entrar na conta</h2>
          <p className="text-sm text-white/70 mb-5">Use seu e-mail ou CPF e senha.</p>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="E-mail ou CPF"
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary text-base"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-10 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary text-base"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <button type="button" className="block mx-auto mt-4 text-primary text-sm font-semibold hover:underline">
            Esqueci minha senha
          </button>
          <p className="text-center mt-4 text-sm text-white/80">
            Não tem uma conta?{" "}
            <button onClick={() => open("register")} className="text-primary font-bold hover:underline">
              Cadastre-se
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
