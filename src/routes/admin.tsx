import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const check = useServerFn(isAdminFn);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => check(),
    enabled: !!user,
    retry: 1,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  // Loading state
  if (loading || (!!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Redirecting to login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <p>Você precisa estar logado.</p>
          <Link to="/login" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold">Ir para login</Link>
        </div>
      </div>
    );
  }

  // Error checking admin status
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="max-w-md text-center space-y-3 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold">Erro ao verificar acesso</h2>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold">Tentar novamente</button>
        </div>
      </div>
    );
  }

  // Not admin
  if (data && !data.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="max-w-md text-center space-y-3 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold">Acesso negado</h2>
          <p className="text-sm text-muted-foreground">Sua conta ({user.email}) não tem permissão de administrador.</p>
          <Link to="/" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold">Voltar ao site</Link>
        </div>
      </div>
    );
  }

  if (!data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <AdminShell><Outlet /></AdminShell>;
}
