import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const cats = [
  { label: "Populares", to: "/" },
  { label: "Slots", to: "/slots" },
  { label: "Crash", to: "/cassino" },
  { label: "Ao Vivo", to: "/ao-vivo" },
  { label: "Todos", to: "/cassino" },
  { label: "Torneios", to: "/torneios" },
  { label: "Promoções", to: "/promocoes" },
] as const;

/** Text navigation with an underline indicator — no pills, no icons. */
export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="no-scrollbar -mx-3 overflow-x-auto border-b border-border px-3 md:mx-0 md:px-0">
      <ul className="flex min-w-max items-center gap-6">
        {cats.map(({ label, to }) => {
          const isActive = active === label;
          return (
            <li key={label}>
              <Link
                to={to}
                className={cn(
                  "relative block whitespace-nowrap py-3 text-[12.5px] font-bold uppercase tracking-[0.14em] transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-[2px] bg-gold transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
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
