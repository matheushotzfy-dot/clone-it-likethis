import { Zap, ShieldCheck, Gamepad2 } from "lucide-react";

const proofs = [
  { Icon: Zap, label: "PIX em segundos", sub: "Depósito aprovado na hora" },
  { Icon: ShieldCheck, label: "Saque 24h", sub: "Sem burocracia" },
  { Icon: Gamepad2, label: "+5.000 jogos", sub: "Provedores oficiais" },
];

export function PromoSide() {
  return (
    <div className="relative hidden w-full shrink-0 overflow-hidden md:flex md:w-[320px] md:flex-col md:justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-background" />
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-[var(--accent-live)]/18 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center px-7 py-9 text-center">
        <h3 className="font-display mt-5 text-3xl font-extrabold leading-none tracking-tight">
          APOSTAYA<span className="text-primary">.BET</span>
        </h3>

        <p className="mt-4 font-display text-3xl font-extrabold leading-tight">
          Bônus de <span className="text-primary">100%</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          no seu primeiro depósito via PIX
        </p>

        <ul className="mt-7 w-full space-y-2 text-left">
          {proofs.map(({ Icon, label, sub }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/12 text-primary">
                <Icon className="size-[15px]" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold leading-tight">{label}</p>
                <p className="truncate text-[10px] font-semibold text-muted-foreground">{sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          18+ · Jogue com responsabilidade
        </p>
      </div>
    </div>
  );
}
