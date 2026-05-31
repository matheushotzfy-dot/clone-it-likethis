import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "./auth-dialog-context";
import { PromoSide } from "./promo-side";
import { User, Mail, Phone, Lock, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";

export function RegisterDialog() {
  const { current, close, open } = useAuthDialog();
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) { toast.error("Você precisa aceitar os termos"); return; }
    if (password.length < 6) { toast.error("Senha mínimo 6 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { cpf, phone },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada! Bem-vindo.");
    close();
  }

  return (
    <Dialog open={current === "register"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="p-0 max-w-[860px] w-[calc(100vw-2rem)] bg-brand border-brand overflow-hidden gap-0 flex flex-col md:flex-row">
        <PromoSide />
        <div className="flex-1 p-8 bg-brand text-white">
          <div className="flex items-start justify-between mb-4">
            <span className="text-2xl font-extrabold"><span className="text-white">pi</span><span className="text-primary">x</span><span className="text-white">bet</span></span>
            <div className="text-right text-sm">
              <p className="text-white/80">Já tem uma conta?</p>
              <button onClick={() => open("login")} className="text-primary font-bold hover:underline">Entrar</button>
            </div>
          </div>
          <h2 className="text-xl font-bold text-primary mb-1">Cadastre-se!</h2>
          <p className="text-sm text-white/90 mb-5">De forma fácil e rápida!</p>
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@example.com" className="w-full h-12 pl-10 pr-10 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary" />
              <Info className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <input type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full h-12 pl-10 pr-10 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-primary" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <label className="flex items-start gap-3 text-xs text-white/90 cursor-pointer">
              <span className="mt-0.5">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="appearance-none size-5 rounded bg-primary checked:bg-primary border-2 border-primary cursor-pointer relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:text-primary-foreground checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-sm checked:after:font-bold" />
              </span>
              <span>
                Declaro não possuir diagnóstico de transtorno do jogo (ludopatia), ter mais de 18 anos e aceitar os{" "}
                <span className="text-primary font-semibold">Termos e Condições</span> e a{" "}
                <span className="text-primary font-semibold">Política de Privacidade</span>.
              </span>
            </label>
            <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-bold uppercase hover:brightness-110 disabled:opacity-50">
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
