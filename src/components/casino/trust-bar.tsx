import { Zap, ShieldCheck, Headphones, BadgeCheck } from "lucide-react";

const items = [
  { Icon: Zap, label: "PIX na hora", sub: "Depósito em segundos" },
  { Icon: ShieldCheck, label: "Saque 24h", sub: "Direto na sua conta" },
  { Icon: BadgeCheck, label: "Jogo justo", sub: "Provedores oficiais" },
  { Icon: Headphones, label: "Suporte 24/7", sub: "Atendimento humano" },
];

export function TrustBar() {
  return (
    <ul className="no-scrollbar snap-row -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:px-0">
      {items.map(({ Icon, label, sub }) => (
        <li
          key={label}
          className="surface-grad flex min-w-[64%] shrink-0 items-center gap-3 rounded-xl border border-border px-3 py-2.5 sm:min-w-[45%] md:min-w-0"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/12 text-primary">
            <Icon className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-extrabold leading-tight">{label}</p>
            <p className="truncate text-[10px] font-semibold text-muted-foreground">{sub}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
