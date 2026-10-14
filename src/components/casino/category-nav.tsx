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

export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Categorias de jogos" className="no-scrollbar w-full min-w-0 overflow-x-auto rounded-md bg-surface">
      <ul className="flex w-max min-w-full items-stretch">
        {cats.map(({ label, to, Icon, search }) => (
          <li key={label} className="flex flex-1">
            <Link to={to} search={(search ?? {}) as never} aria-current={active === label ? "page" : undefined}
              data-active={active === label}
              className={cn("category-tab flex h-12 shrink-0 items-center justify-center gap-2 px-4 text-xs font-bold text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:px-5")}>
              <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
