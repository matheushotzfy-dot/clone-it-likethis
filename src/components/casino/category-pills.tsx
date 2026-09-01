import { Link } from "@tanstack/react-router";
import { Flame, Gamepad2, Rocket, MonitorPlay, LayoutGrid, Trophy, Gift, Dices } from "lucide-react";
import { cn } from "@/lib/utils";

const cats = [
  { label: "Populares", to: "/", Icon: Flame },
  { label: "Slots", to: "/slots", Icon: Gamepad2 },
  { label: "Crash", to: "/cassino", Icon: Rocket },
  { label: "Ao Vivo", to: "/ao-vivo", Icon: MonitorPlay },
  { label: "Mesas", to: "/ao-vivo", Icon: Dices },
  { label: "Todos", to: "/cassino", Icon: LayoutGrid },
  { label: "Torneios", to: "/torneios", Icon: Trophy },
  { label: "Promoções", to: "/promocoes", Icon: Gift },
] as const;

export function CategoryPills({ active }: { active?: string }) {
  return (
    <div className="no-scrollbar snap-row -mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-2 md:min-w-0 md:flex-wrap">
        {cats.map(({ label, to, Icon }) => {
          const isActive = active === label;
          return (
            <Link
              key={label}
              to={to}
              className={cn(
                "slick flex h-10 shrink-0 items-center gap-2 rounded-md border px-3.5 text-[13px] font-semibold",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface/60 text-foreground/75 hover:border-primary/60 hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
