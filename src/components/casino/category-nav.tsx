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
              className={cn("cat-card group relative flex h-[72px] w-[148px] flex-1 items-center overflow-hidden rounded-xl pl-3.5 md:h-[84px] md:min-w-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary")}>
              <span className="relative z-10 flex items-center gap-0.5 text-[15px] font-black uppercase leading-none tracking-tight text-foreground md:text-[17px]">
                {label}
                <svg viewBox="0 0 24 24" className="size-4 opacity-80 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
              </span>
              <img src={img} alt="" width={816} height={816} loading="lazy"
                className="cat-card-art pointer-events-none absolute -right-2 top-1/2 -mt-[34px] size-[68px] object-contain drop-shadow-[0_8px_12px_var(--background)] md:-mt-[40px] md:size-[80px]" />
              {live && (
                <span className="absolute left-3 top-1.5 z-10 flex items-center gap-1 rounded-full bg-live px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary-foreground" /> live
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
