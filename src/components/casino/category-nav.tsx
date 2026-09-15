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
    <nav className="edge-fade no-scrollbar snap-row w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
      <ul className="flex w-max items-stretch gap-1.5">
        {cats.map(({ label, to, Icon, accent, search, live }) => {
          const isActive = active === label;
          return (
            <li key={label} className="flex">
              <Link
                to={to}
                search={(search ?? {}) as never}
                data-active={isActive}
                className={cn(
                  accent,
                  "slick group relative flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[11px] font-extrabold uppercase tracking-[0.1em] md:h-10 md:px-4 md:text-[11.5px]",
                  isActive
                    ? "border-[color-mix(in_srgb,var(--cat,var(--primary))_55%,transparent)] bg-[color-mix(in_srgb,var(--cat,var(--primary))_16%,transparent)] text-cat shadow-[0_0_18px_-6px_var(--cat,var(--primary))]"
                    : "border-border bg-surface/55 text-foreground/65 hover:border-[color-mix(in_srgb,var(--cat,var(--primary))_40%,transparent)] hover:bg-surface hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
                    isActive
                      ? "bg-[color-mix(in_srgb,var(--cat,var(--primary))_22%,transparent)]"
                      : "bg-foreground/[0.06] group-hover:bg-[color-mix(in_srgb,var(--cat,var(--primary))_18%,transparent)]",
                  )}
                >
                  <Icon
                    className={cn("size-[13px] text-cat", live && "ping-soft")}
                    strokeWidth={2.6}
                  />
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
