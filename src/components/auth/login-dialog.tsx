import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "./auth-dialog-context";
import { PromoSide } from "./promo-side";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function LoginDialog() {
  const { current, close, open } = useAuthDialog();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message); return; }
    toast.success("Bem-vindo!");
    close();
  }

  return (
    <Dialog open={current === "login"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="p-0 max-w-[860px] w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] bg-brand border-brand overflow-hidden gap-0 flex flex-col md:flex-row max-h-[92vh] sm:rounded-2xl">
        <PromoSide />
        <div className="flex-1 p-6 md:p-8 bg-brand text-white overflow-y-auto">
          <div className="text-center mb-6">
            <span className="text-2xl font-black"><span className="text-white">SANTOS</span><span className="text-primary">BET</span></span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Entrar</h2>
          <p className="text-sm text-white/80 mb-6">Bem-vindo! Preencha os campos abaixo<br/>para acessar sua conta.</p>
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input
                type="email"
                placeholder="Usuário, CPF, E-mail ou Telefone"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input
                type={show ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-10 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-bold uppercase hover:brightness-110 disabled:opacity-50">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <button type="button" className="block mx-auto mt-4 text-primary text-sm font-semibold hover:underline">
            Esqueci minha senha
          </button>
          <p className="text-center mt-4 text-sm text-white/80">
            Não tem uma conta?{" "}
            <button onClick={() => open("register")} className="text-primary font-bold hover:underline">Registrar</button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
