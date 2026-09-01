import { Link } from "@tanstack/react-router";
import { Flame, Gamepad2, Rocket, MonitorPlay, LayoutGrid, Trophy, Gift, Dices } from "lucide-react";
import { cn } from "@/lib/utils";

const cats = [
  { label: "Populares", to: "/", Icon: Flame, accent: "cat-hot" },
  { label: "Slots", to: "/slots", Icon: Gamepad2, accent: "cat-slots" },
  { label: "Crash", to: "/cassino", Icon: Rocket, accent: "cat-crash" },
  { label: "Ao Vivo", to: "/ao-vivo", Icon: MonitorPlay, accent: "cat-live" },
  { label: "Mesas", to: "/ao-vivo", Icon: Dices, accent: "cat-live" },
  { label: "Todos", to: "/cassino", Icon: LayoutGrid, accent: "cat-neutral" },
  { label: "Torneios", to: "/torneios", Icon: Trophy, accent: "cat-hot" },
  { label: "Promoções", to: "/promocoes", Icon: Gift, accent: "cat-crash" },
] as const;

export function CategoryPills({ active }: { active?: string }) {
  return (
    <div className="no-scrollbar snap-row -mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-2 md:min-w-0 md:flex-wrap">
        {cats.map(({ label, to, Icon, accent }) => {
          const isActive = active === label;
          return (
            <Link
              key={label}
              to={to}
              className={cn(
                accent,
                "slick tap-44 flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-[13px] font-bold",
                isActive
                  ? "border-cat bg-cat-soft text-cat"
                  : "surface-grad border-border text-foreground/75 hover:border-cat hover:text-cat",
              )}
            >
              <Icon className={cn("size-[18px]", isActive && "text-cat")} strokeWidth={2.25} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
