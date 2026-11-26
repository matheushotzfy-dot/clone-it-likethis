import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { IcCasino, IcSports } from "@/components/icons/maxy-icons";

/** Chave Cassino | Esportes. */
export function ModeSwitch({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sports = path.startsWith("/esportes");
  const items = [
    { to: "/", label: "Cassino", Icon: IcCasino, active: !sports },
    { to: "/esportes", label: "Esportes", Icon: IcSports, active: sports },
  ] as const;
  return (
    <div
      className={cn(
        "grid gap-1 rounded-[10px] bg-background p-1",
        compact ? "grid-cols-1" : "grid-cols-2",
        className,
      )}
    >
      {items.map(({ to, label, Icon, active }) => (
        <Link
          key={to}
          to={to}
          title={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-9 items-center justify-center gap-2 rounded-[7px] font-display text-[16px] font-bold transition-colors",
            active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className={cn("size-[18px]", active && "text-primary")} />
          {!compact && label}
        </Link>
      ))}
    </div>
  );
}
