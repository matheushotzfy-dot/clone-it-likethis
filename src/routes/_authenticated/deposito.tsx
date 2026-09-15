import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useEffect } from "react";
import { SiteShell } from "@/components/layout/site-shell";

export const Route = createFileRoute("/_authenticated/deposito")({
  head: () => ({ meta: [{ title: "Depósito — APOSTAYA.BET" }, { property: "og:title", content: "Depósito — APOSTAYA.BET" }] }),
  component: Page,
});

function Page() {
  const { open } = useAuthDialog();
  useEffect(() => { open("deposit"); }, [open]);
  return (
    <SiteShell>
      <div className="max-w-xl mx-auto px-4 py-10 text-center text-muted-foreground">
        <p>Abrindo janela de depósito...</p>
        <Link to="/perfil" className="text-primary font-bold mt-3 inline-block">Voltar ao perfil</Link>
      </div>
    </SiteShell>
  );
}
