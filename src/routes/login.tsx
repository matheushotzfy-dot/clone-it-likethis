import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — SANTOSBET" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/perfil", replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
      return;
    }
    toast.success("Bem-vindo!");
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-brand px-4 pt-8 pb-10 sm:py-10 overflow-x-hidden">
      <div className="w-full max-w-md bg-brand-2 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="text-center">
          <Logo className="justify-center" />
          <h1 className="text-2xl font-black mt-4 text-white uppercase tracking-tight">Entrar na sua conta</h1>
          <p className="text-sm text-white/60 mt-1">Bem-vindo de volta!</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-bold text-white/50 uppercase ml-1">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base"
                placeholder="exemplo@email.com"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[11px] font-bold text-white/50 uppercase ml-1">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-10 pr-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base"
                placeholder="Sua senha"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-black uppercase tracking-wider bg-primary text-primary-foreground hover:brightness-110 transition-all" disabled={loading}>
            {loading ? "Entrando..." : "ENTRAR"}
          </Button>
        </form>
        <div className="text-center text-sm space-y-3 border-t border-white/5 pt-6">
          <p className="text-white/60">
            Não tem conta?{" "}
            <Link to="/registro" className="text-primary font-bold hover:underline">Criar agora</Link>
          </p>
          <Link to="/" className="text-xs text-white/40 hover:text-white inline-block">← Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}
