import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import casinoArt from "@/assets/casino-banner-v2.png.asset.json";
import sportsArt from "@/assets/sports-banner-v2.png.asset.json";

/** As duas portas de entrada: cassino e esportes. */
export function HubTiles() {
  const tiles = [
    { to: "/cassino", title: "Cassino", note: "Slots, crash e mesas ao vivo", img: casinoArt.url },
    {
      to: "/esportes",
      title: "Esportes",
      note: "Brasileirão, Champions e NBA",
      img: sportsArt.url,
    },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-4">
      {tiles.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="group block min-w-0 overflow-hidden rounded-[14px] border border-border bg-surface transition-colors hover:border-primary/50"
        >
          <div className="aspect-[2.6/1] overflow-hidden">
            <img
              src={t.img}
              alt=""
              width={900}
              height={346}
              fetchPriority="high"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 px-3 py-2.5 md:px-5 md:py-3">
            <span className="min-w-0">
              <span className="block font-display text-[19px] font-bold leading-none md:text-[22px]">
                {t.title}
              </span>
              <span className="mt-1 hidden truncate text-[13px] text-muted-foreground sm:block">
                {t.note}
              </span>
            </span>
            <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </Link>
      ))}
    </div>
  );
}
