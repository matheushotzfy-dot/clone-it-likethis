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
 * High-density segmented category bar.
 * One continuous rail with hairline dividers instead of floating pills — the
 * active tab is marked by a tinted cell plus a 2px accent underline, so the
 * whole nav occupies a single compact 34/38px band.
 */
export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="edge-fade no-scrollbar snap-row w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-[10px] border border-border bg-surface/45">
      <ul className="flex w-max items-stretch">
        {cats.map(({ label, to, Icon, accent, search, live }, i) => {
          const isActive = active === label;
          return (
            <li key={label} className={cn("flex", i > 0 && "border-l border-border/70")}>
              <Link
                to={to}
                search={(search ?? {}) as never}
                data-active={isActive}
                className={cn(
                  accent,
                  "slick group relative flex h-[34px] shrink-0 items-center gap-1.5 px-3 text-[11px] font-extrabold uppercase tracking-[0.12em] md:h-[38px] md:px-4 md:text-[11.5px]",
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--cat,var(--primary))_14%,transparent)] text-cat"
                    : "text-foreground/60 hover:bg-foreground/[0.05] hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-[13px] shrink-0 text-cat", live && "ping-soft")}
                  strokeWidth={2.6}
                />
                {label}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[var(--cat,var(--primary))] transition-transform duration-200 ease-out",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
