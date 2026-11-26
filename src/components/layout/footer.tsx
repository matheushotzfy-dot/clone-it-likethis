import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

const cols: { title: string; links: (readonly [string, string, string?])[] }[] = [
  {
    title: "Cassino",
    links: [
      ["/cassino", "Todos os jogos"],
      ["/slots", "Slots"],
      ["/ao-vivo", "Cassino ao vivo"],
      ["/esportes", "Esportes"],
    ],
  },
  {
    title: "Sua conta",
    links: [
      ["/perfil", "Minha conta"],
      ["/historico", "Extrato"],
      ["/saque", "Sacar"],
      ["/perfil", "Limites de jogo", "limites"],
    ],
  },
  {
    title: "Informações",
    links: [
      ["/legal/termos", "Termos de uso"],
      ["/legal/privacidade", "Privacidade"],
      ["/legal/jogo-responsavel", "Jogo responsável"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-sidebar">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-10 md:grid-cols-[1.3fr_repeat(3,1fr)] md:px-6">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Apostas envolvem risco de perda financeira e não são investimento. Defina limites de
            depósito e de perda na sua conta e pare quando quiser.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="grid size-9 place-items-center rounded-full border-2 border-destructive font-display text-[15px] font-bold text-destructive">
              18+
            </span>
            <span className="text-[12.5px] leading-snug text-muted-foreground">
              Proibido para menores de 18 anos.
            </span>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-[13px] font-semibold text-foreground/90">{c.title}</p>
            <ul className="space-y-2 text-[14px]">
              {c.links.map(([to, label, aba]) => (
                <li key={label}>
                  <Link
                    to={to}
                    search={(aba ? { aba } : undefined) as never}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-[1600px] px-4 py-5 text-[12.5px] text-muted-foreground md:px-6">
          © {new Date().getFullYear()} apostamaxy. Se o jogo deixou de ser diversão, procure ajuda:
          o CVV atende pelo 188, todos os dias.
        </p>
      </div>
    </footer>
  );
}
