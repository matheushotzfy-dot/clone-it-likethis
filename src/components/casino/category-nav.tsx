import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import imgPopulares from "@/assets/cat-populares.png";
import imgSlots from "@/assets/cat-slots.png";
import imgCrash from "@/assets/cat-crash.png";
import imgAoVivo from "@/assets/cat-aovivo.png";
import imgTodos from "@/assets/cat-todos.png";
import imgTorneios from "@/assets/cat-torneios.png";
import imgPromocoes from "@/assets/cat-promocoes.png";

type Cat = {
  label: string;
  to: string;
  img: string;
  search?: Record<string, string>;
  live?: boolean;
};

const cats: Cat[] = [
  { label: "Populares", to: "/", img: imgPopulares },
  { label: "Slots", to: "/slots", img: imgSlots },
  { label: "Crash", to: "/cassino", img: imgCrash, search: { cat: "crash" } },
  { label: "Ao Vivo", to: "/ao-vivo", img: imgAoVivo, live: true },
  { label: "Todos", to: "/cassino", img: imgTodos },
  { label: "Torneios", to: "/torneios", img: imgTorneios },
  { label: "Promoções", to: "/promocoes", img: imgPromocoes },
];

/** Category cards with 3D cobalt artwork, matching the Cassino/Esportes banners. */
export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Categorias de jogos" className="no-scrollbar -mx-1 w-full min-w-0 overflow-x-auto px-1 py-1">
      <ul className="flex w-max min-w-full gap-2 md:gap-3">
        {cats.map(({ label, to, img, search, live }) => (
          <li key={label} className="flex flex-1">
            <Link to={to} search={(search ?? {}) as never} aria-current={active === label ? "page" : undefined}
              data-active={active === label}
              className={cn("cat-card group relative flex h-[86px] w-[112px] flex-1 flex-col items-center justify-end overflow-hidden rounded-xl pb-2 md:h-[104px] md:min-w-[128px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary")}>
              <img src={img} alt="" width={816} height={816} loading="lazy"
                className="pointer-events-none absolute left-1/2 top-1 size-[58px] -translate-x-1/2 object-contain drop-shadow-[0_8px_14px_var(--cat-shadow)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110 md:size-[70px]" />
              {live && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-live/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary-foreground" /> live
                </span>
              )}
              <span className="relative font-display text-[12px] font-bold uppercase tracking-wide text-foreground/85 group-hover:text-foreground group-data-[active=true]:text-foreground md:text-[13px]">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
