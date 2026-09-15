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

/**
 * Category chips — same radius/hairline language as the game tiles so the nav
 * reads as part of the grid instead of a floating pill row.
 * Stays inside the parent padding (no negative margins) to avoid page-level
 * horizontal scroll on small screens.
 */
export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="edge-fade no-scrollbar snap-row w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
      <ul className="flex w-max items-center gap-1.5 pr-4 md:gap-2">
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
                  "chip3d flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] md:h-10 md:px-3.5 md:text-[12px]",
                  isActive ? "text-cat" : "text-foreground/70 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "icon-halo relative grid size-5 shrink-0 place-items-center rounded-[6px]",
                    live && "ping-soft",
                  )}
                >
                  <Icon className="size-[14px] text-cat" strokeWidth={2.5} />
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
