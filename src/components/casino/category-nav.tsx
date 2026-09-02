import { Link } from "@tanstack/react-router";
import { Flame, Rocket, Radio, Cherry, LayoutGrid, Trophy, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

type Cat = {
  label: string;
  to: string;
  Icon: typeof Flame;
  accent: string;
  search?: Record<string, string>;
  live?: boolean;
};

const cats: Cat[] = [
  { label: "Populares", to: "/", Icon: Flame, accent: "cat-hot" },
  { label: "Slots", to: "/slots", Icon: Cherry, accent: "cat-slots" },
  { label: "Crash", to: "/cassino", Icon: Rocket, accent: "cat-crash", search: { cat: "crash" } },
  { label: "Ao Vivo", to: "/ao-vivo", Icon: Radio, accent: "cat-live", live: true },
  { label: "Todos", to: "/cassino", Icon: LayoutGrid, accent: "cat-neutral" },
  { label: "Torneios", to: "/torneios", Icon: Trophy, accent: "cat-hot" },
  { label: "Promoções", to: "/promocoes", Icon: Gift, accent: "cat-crash" },
];

/** Category chips with haloed icons — compact on mobile, glowing on hover. */
export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="no-scrollbar snap-row -mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
      <ul className="flex min-w-max items-center gap-2">
        {cats.map(({ label, to, Icon, accent, search, live }) => {
          const isActive = active === label;
          return (
            <li key={label}>
              <Link
                to={to}
                search={(search ?? {}) as never}
                data-active={isActive}
                className={cn(
                  accent,
                  "chip3d flex h-10 shrink-0 items-center gap-2 rounded-full border border-border px-3.5 text-[12px] font-extrabold uppercase tracking-[0.08em] md:h-11 md:px-4 md:text-[12.5px]",
                  isActive ? "text-cat" : "text-foreground/70 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "icon-halo relative grid size-6 shrink-0 place-items-center rounded-full",
                    live && "ping-soft",
                  )}
                >
                  <Icon className="size-[15px] text-cat" strokeWidth={2.4} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
