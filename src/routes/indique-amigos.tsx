import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/indique-amigos")({
  head: () => ({
    meta: pageMeta("Indique amigos | apostamaxy", "Programa de indicação da apostamaxy."),
  }),
  component: Page,
});

function Page() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-[900px] px-3 py-6 md:px-6 md:py-10">
        <h1 className="text-[32px] md:text-[38px]">Indique amigos</h1>
        <div className="mt-6 rounded-[14px] border border-border bg-surface px-6 py-12 text-center">
          <p className="font-display text-[24px] font-bold">
            O programa de indicação ainda não está aberto
          </p>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted-foreground">
            Quando abrir, seu link pessoal e as regras completas aparecem nesta página.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex h-11 items-center rounded-[10px] bg-primary px-5 font-bold text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
