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

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — PIXBET" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <Logo className="justify-center" />
          <h1 className="text-2xl font-bold mt-4">Entrar na sua conta</h1>
          <p className="text-sm text-muted-foreground">Bem-vindo de volta!</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-surface-2" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-surface-2" required />
          </div>
          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? "Entrando..." : "ENTRAR"}
          </Button>
        </form>
        <div className="text-center text-sm space-y-2">
          <p className="text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/registro" className="text-primary font-semibold hover:underline">Criar agora</Link>
          </p>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-block">← Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}
