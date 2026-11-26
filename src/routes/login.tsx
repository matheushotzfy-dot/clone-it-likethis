import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: pageMeta("Entrar | apostamaxy", "Entre na sua conta com e-mail ou CPF.") }),
  component: Page,
});

/** Endereço direto para o login (usado quando uma página da conta exige entrar). */
function Page() {
  const { user, loading } = useAuth();
  const { open, current } = useAuthDialog();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (user) navigate({ to: "/perfil", replace: true });
    else if (current !== "login" && current !== "register") open("login");
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-[30px]">Entre para continuar</h1>
        <p className="mt-2 text-muted-foreground">Esta página é da sua conta.</p>
        <button
          type="button"
          onClick={() => open("login")}
          className="mt-6 h-11 rounded-[10px] bg-primary px-6 font-bold text-primary-foreground"
        >
          Entrar
        </button>
      </div>
    </SiteShell>
  );
}
