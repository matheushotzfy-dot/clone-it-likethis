import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { usePublicSettings } from "@/hooks/use-account";
import { formatCnpj } from "@/lib/validations";

/** Página de texto legal: largura de leitura, títulos em hierarquia e quem é a operadora. */
export function LegalDoc({
  title,
  intro,
  versioned = false,
  children,
}: {
  title: string;
  intro?: ReactNode;
  /** Termos e Privacidade mostram a versão que o jogador aceita. */
  versioned?: boolean;
  children: ReactNode;
}) {
  const s = usePublicSettings().data;
  return (
    <SiteShell>
      <article className="legal-doc mx-auto max-w-[72ch] px-4 py-6 sm:py-10 md:py-14">
        <h1 className="font-display text-[27px] font-bold leading-tight sm:text-[34px] md:text-[40px]">
          {title}
        </h1>
        {versioned && s?.termsVersion && (
          <p className="mt-1 text-[13px] text-muted-foreground">Versão {s.termsVersion}</p>
        )}
        {intro && (
          <div className="mt-5 text-[16px] leading-relaxed text-foreground/90">{intro}</div>
        )}
        <CompanyBlock />
        <div className="mt-8 space-y-8">{children}</div>
        <nav
          aria-label="Outros documentos"
          className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-[14px]"
        >
          <Link to="/legal/termos" className="text-muted-foreground hover:text-foreground">
            Termos de Uso
          </Link>
          <Link to="/legal/privacidade" className="text-muted-foreground hover:text-foreground">
            Política de Privacidade
          </Link>
          <Link
            to="/legal/jogo-responsavel"
            className="text-muted-foreground hover:text-foreground"
          >
            Jogo responsável
          </Link>
          <Link to="/atendimento" className="text-muted-foreground hover:text-foreground">
            Atendimento e ouvidoria
          </Link>
        </nav>
      </article>
    </SiteShell>
  );
}

export function CompanyBlock() {
  const s = usePublicSettings().data;
  if (!s?.company?.name) return null;
  return (
    <p className="mt-5 rounded-[10px] border border-border bg-surface px-4 py-3 text-[13.5px] leading-relaxed text-muted-foreground">
      Operado por <strong className="font-semibold text-foreground">{s.company.name}</strong>
      {s.company.cnpj && <span className="num">, CNPJ {formatCnpj(s.company.cnpj)}</span>}
      {s.spaAuthorization && <>. Autorização SPA/MF: {s.spaAuthorization}</>}.
    </p>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-[20px] font-bold leading-snug sm:text-[23px]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-[1.65] sm:text-[15.5px] sm:leading-[1.7] text-foreground/85 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
