import { Link } from "@tanstack/react-router";
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
          className="group block min-w-0 overflow-hidden rounded-[14px] border border-border bg-surface"
        >
          <div className="aspect-[2.6/1] overflow-hidden">
            <img
              src={t.img}
              alt={t.title}
              width={900}
              height={346}
              fetchPriority="high"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 md:px-5 md:py-3">
            <span className="font-display text-[18px] font-bold leading-none md:text-[22px]">
              Entrar no {t.title.toLowerCase()}
            </span>
            <span className="hidden truncate text-[13px] text-muted-foreground md:block">
              {t.note}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
