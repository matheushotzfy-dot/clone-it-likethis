import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { AdminShell } from "@/components/admin/admin-shell";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin | apostamaxy" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">{children}</div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) setError("E-mail ou senha incorretos.");
  }
  return (
    <Centered>
      <form
        onSubmit={submit}
        className="w-full max-w-[380px] rounded-[16px] border border-border bg-surface p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <Logo />
          <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
            admin
          </span>
        </div>
        <h1 className="text-[26px]">Entrar no painel</h1>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold">E-mail</span>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold">Senha</span>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p role="alert" className="text-[13.5px] text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-[10px] font-bold shadow-none"
          >
            {busy ? <Loader2 className="animate-spin" /> : "Entrar"}
          </Button>
        </div>
      </form>
    </Centered>
  );
}

function AdminLayout() {
  const { user, loading, signOut } = useAuth();
  const check = useServerFn(isAdminFn);
  const q = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => check(),
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (loading || (user && q.isLoading))
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-primary" />
      </Centered>
    );
  if (!user) return <AdminLogin />;
  if (q.error) {
    return (
      <Centered>
        <div className="max-w-sm text-center">
          <p className="font-display text-[22px] font-bold">Não foi possível conferir o acesso</p>
          <Button className="mt-4 shadow-none" onClick={() => q.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </Centered>
    );
  }
  if (!q.data?.isAdmin) {
    return (
      <Centered>
        <div className="max-w-sm text-center">
          <p className="font-display text-[24px] font-bold">Esta conta não é de administrador</p>
          <p className="mt-2 text-[14px] text-muted-foreground">Você entrou como {user.email}.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" className="shadow-none" onClick={() => signOut()}>
              Trocar de conta
            </Button>
            <Button asChild className="shadow-none">
              <Link to="/">Ir para o site</Link>
            </Button>
          </div>
        </div>
      </Centered>
    );
  }
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
