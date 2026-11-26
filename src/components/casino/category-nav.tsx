import { Link } from "@tanstack/react-router";
import imgPopulares from "@/assets/cat-populares.png";
import imgSlots from "@/assets/cat-slots.png";
import imgCrash from "@/assets/cat-crash.png";
import imgAoVivo from "@/assets/cat-aovivo.png";
import imgTodos from "@/assets/cat-todos.png";
import imgPromocoes from "@/assets/cat-promocoes.png";

export type CategoryKey = "inicio" | "slots" | "crash" | "aovivo" | "todos" | "promocoes";

const cats: {
  key: CategoryKey;
  label: string;
  to: string;
  img: string;
  search?: Record<string, string>;
}[] = [
  { key: "inicio", label: "Populares", to: "/", img: imgPopulares },
  { key: "slots", label: "Slots", to: "/slots", img: imgSlots },
  { key: "crash", label: "Crash", to: "/cassino", img: imgCrash, search: { cat: "crash" } },
  { key: "aovivo", label: "Ao vivo", to: "/ao-vivo", img: imgAoVivo },
  { key: "todos", label: "Todos", to: "/cassino", img: imgTodos },
  { key: "promocoes", label: "Promoções", to: "/promocoes", img: imgPromocoes },
];

export function CategoryNav({ active }: { active?: CategoryKey }) {
  return (
    <nav
      aria-label="Categorias"
      className="no-scrollbar -mx-3 overflow-x-auto px-3 md:mx-0 md:px-0"
    >
      <ul className="flex w-max min-w-full gap-2 md:gap-2.5">
        {cats.map((c) => (
          <li key={c.key} className="flex flex-1">
            <Link
              to={c.to}
              search={(c.search ?? {}) as never}
              data-active={active === c.key}
              aria-current={active === c.key ? "page" : undefined}
              className="cat-card flex-1"
            >
              <span className="relative z-10 font-display text-[19px] font-bold leading-none md:text-[21px]">
                {c.label}
              </span>
              <img
                src={c.img}
                alt=""
                width={140}
                height={140}
                loading="lazy"
                className="cat-card-art"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
