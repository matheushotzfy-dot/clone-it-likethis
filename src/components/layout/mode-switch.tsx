import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { IcCasino, IcSports } from "@/components/icons/maxy-icons";

/** Chave Cassino | Esportes (estrutura inspirada na Stake). */
export function ModeSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sports = path.startsWith("/esportes");
  const items = [
    { to: "/cassino", label: "Cassino", Icon: IcCasino, active: !sports },
    { to: "/esportes", label: "Esportes", Icon: IcSports, active: sports },
  ] as const;
  return (
    <div className={cn("grid grid-cols-2 gap-1 rounded-md bg-background p-1", compact && "grid-cols-1", className)}>
      {items.map(({ to, label, Icon, active }) => (
        <Link key={to} to={to} title={label} aria-current={active ? "page" : undefined}
          className={cn(
            "font-display flex h-9 items-center justify-center gap-1.5 rounded-[4px] text-[13px] font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground",
          )}>
          <Icon className="size-[18px]" />
          {!compact && label}
        </Link>
      ))}
    </div>
  );
}
