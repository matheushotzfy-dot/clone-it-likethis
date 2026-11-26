import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";
import { IcPix } from "@/components/icons/maxy-icons";
import { useProviders } from "@/hooks/use-games";

type FooterLink = { to: string; label: string; search?: Record<string, string> };

const cols: { title: string; links: FooterLink[] }[] = [
  {
    title: "Cassino",
    links: [
      { to: "/cassino", label: "Todos os jogos" },
      { to: "/slots", label: "Slots" },
      { to: "/cassino", label: "Crash", search: { cat: "crash" } },
      { to: "/ao-vivo", label: "Cassino ao vivo" },
      { to: "/provedores", label: "Provedores" },
    ],
  },
  {
    title: "Esportes",
    links: [
      { to: "/esportes", label: "Apostas esportivas" },
      { to: "/esportes", label: "Ao vivo agora", search: { aba: "ao-vivo" } },
      { to: "/esportes", label: "Futebol brasileiro", search: { liga: "brasil" } },
      { to: "/esportes", label: "NBA", search: { liga: "nba" } },
    ],
  },
  {
    title: "Sua conta",
    links: [
      { to: "/perfil", label: "Meus dados" },
      { to: "/historico", label: "Extrato e apostas" },
      { to: "/saque", label: "Sacar" },
      { to: "/perfil", label: "Limites de jogo", search: { aba: "limites" } },
    ],
  },
  {
    title: "Regras e ajuda",
    links: [
      { to: "/legal/termos", label: "Termos de uso" },
      { to: "/legal/privacidade", label: "Privacidade" },
      { to: "/legal/jogo-responsavel", label: "Jogo responsável" },
      { to: "/promocoes", label: "Promoções" },
    ],
  },
];

export function Footer() {
  const providers = useProviders();
  const names = (providers.data ?? []).slice(0, 12);

  return (
    <footer className="mt-14 border-t border-border bg-sidebar">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.25fr_2.75fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Cassino e apostas esportivas com depósito e saque por Pix na chave CPF do titular.
            Apostas envolvem risco de perda e não são investimento.
          </p>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-destructive font-display text-[15px] font-bold text-destructive">
              18+
            </span>
            <span className="text-[12.5px] leading-snug text-muted-foreground">
              Proibido para menores de 18 anos. Defina limites de depósito e de perda na sua conta.
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2">
            <IcPix className="size-[18px] text-pix" />
            <span className="text-[13px] font-semibold">Pix</span>
            <span className="text-[12.5px] text-muted-foreground">depósito e saque</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="mb-3 text-[13px] font-semibold text-foreground/90">{c.title}</p>
              <ul className="space-y-2 text-[14px]">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      search={(l.search ?? {}) as never}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {names.length > 0 && (
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 md:px-6">
            <span className="text-[12.5px] font-semibold text-foreground/80">Provedores</span>
            {names.map((p) => (
              <Link
                key={p.name}
                to="/cassino"
                search={{ provedor: p.name } as never}
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-1.5 px-4 py-5 text-[12.5px] text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} apostamaxy</p>
          <p>
            Se o jogo deixou de ser diversão, procure ajuda: o CVV atende pelo 188, todos os dias.
          </p>
        </div>
      </div>
    </footer>
  );
}
