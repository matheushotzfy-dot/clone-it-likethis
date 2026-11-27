import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: pageMeta("Criar conta | apostamaxy", "Cadastro com CPF em menos de um minuto."),
  }),
  component: Page,
});

/** Endereço direto para o cadastro (links de anúncio caem aqui). */
function Page() {
  const { user, loading } = useAuth();
  const { open, current } = useAuthDialog();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (user) navigate({ to: "/", replace: true });
    else if (current !== "register" && current !== "login") open("register");
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-[24px] sm:text-[30px]">Crie sua conta</h1>
        <p className="mt-2 text-muted-foreground">Cadastro com CPF, 18 anos ou mais.</p>
        <button
          type="button"
          onClick={() => open("register")}
          className="mt-6 h-11 rounded-[10px] bg-primary px-6 font-bold text-primary-foreground"
        >
          Criar conta
        </button>
      </div>
    </SiteShell>
  );
}
