import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

const cols = [
  {
    title: "Jogar",
    links: [
      { to: "/cassino", label: "Cassino" },
      { to: "/slots", label: "Slots" },
      { to: "/ao-vivo", label: "Ao Vivo" },
      { to: "/torneios", label: "Torneios" },
    ],
  },
  {
    title: "Conta",
    links: [
      { to: "/login", label: "Entrar" },
      { to: "/registro", label: "Cadastrar" },
      { to: "/deposito", label: "Depósito" },
      { to: "/saque", label: "Saque" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/legal/termos", label: "Termos de Uso" },
      { to: "/legal/privacidade", label: "Privacidade" },
      { to: "/legal/jogo-responsavel", label: "Jogo Responsável" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-sidebar">
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="mb-3 text-[11px] font-semibold text-muted-foreground">
                {c.title}
              </h4>
              <ul className="space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link to={l.to} className="text-foreground/70 transition-colors hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="mb-3 text-[11px] font-semibold text-muted-foreground">
              Suporte
            </h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>Jogo responsável</li>
              <li>Depósitos via PIX</li>
              <li>Valores em reais</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <div className="flex items-center gap-2">
            {["PIX", "+18", "SSL", "RNG"].map((b) => (
              <div
                key={b}
                className={
                  b === "+18"
                    ? "rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground"
                    : "rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground/80"
                }
              >
                {b}
              </div>
            ))}
          </div>
          <Logo />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} apostamaxy — Jogue com responsabilidade. Proibido para menores de 18 anos.
        </p>
      </div>
    </footer>
  );
}
