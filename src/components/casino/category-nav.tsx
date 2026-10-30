import { Link } from "@tanstack/react-router";
import { IcFire, IcCrash, IcLive, IcSlots, IcGrid, IcTrophy, IcGift, type MaxyIcon } from "@/components/icons/maxy-icons";
import { cn } from "@/lib/utils";

type Cat = {
  label: string;
  to: string;
  Icon: MaxyIcon;
  accent: string;
  search?: Record<string, string>;
  live?: boolean;
};

const cats: Cat[] = [
  { label: "Populares", to: "/", Icon: IcFire, accent: "cat-hot" },
  { label: "Slots", to: "/slots", Icon: IcSlots, accent: "cat-slots" },
  { label: "Crash", to: "/cassino", Icon: IcCrash, accent: "cat-crash", search: { cat: "crash" } },
  { label: "Ao Vivo", to: "/ao-vivo", Icon: IcLive, accent: "cat-live", live: true },
  { label: "Todos", to: "/cassino", Icon: IcGrid, accent: "cat-neutral" },
  { label: "Torneios", to: "/torneios", Icon: IcTrophy, accent: "cat-hot" },
  { label: "Promoções", to: "/promocoes", Icon: IcGift, accent: "cat-crash" },
];

export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Categorias de jogos" className="no-scrollbar w-full min-w-0 overflow-x-auto rounded-md bg-surface">
      <ul className="flex w-max min-w-full items-stretch">
        {cats.map(({ label, to, Icon, search }) => (
          <li key={label} className="flex flex-1">
            <Link to={to} search={(search ?? {}) as never} aria-current={active === label ? "page" : undefined}
              data-active={active === label}
              className={cn("category-tab flex h-12 shrink-0 items-center justify-center gap-2 px-4 font-display text-[13px] font-bold uppercase tracking-wide text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:px-5")}>
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
