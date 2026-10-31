import { Link } from "@tanstack/react-router";
import { IcCasino, IcSports } from "@/components/icons/maxy-icons";
import casinoArt from "@/assets/casino-banner.png.asset.json";
import sportsArt from "@/assets/sports-banner.png.asset.json";

/** Two large hub cards (Cassino / Esportes) with artwork and a footer action bar. */
export function HubTiles() {
  const tiles = [
    { to: "/cassino", title: "Cassino", cta: "Jogar agora", note: "Slots, crash e ao vivo", icon: IcCasino, img: casinoArt.url },
    { to: "/esportes", title: "Esportes", cta: "Apostar agora", note: "Odds ao vivo", icon: IcSports, img: sportsArt.url },
  ] as const;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
      {tiles.map(({ to, title, cta, note, icon: Icon, img }) => (
        <Link key={to} to={to}
          className="group overflow-hidden rounded-lg bg-surface transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
          <div className="relative aspect-[2.6/1] overflow-hidden">
            <img src={img} alt={title} width={900} height={346} fetchPriority="high"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            <h2 className="sr-only">{title}</h2>
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3 md:px-5">
            <span className="flex items-center gap-2 text-sm font-bold md:text-base">
              <Icon className="size-5 text-foreground/80" /> {cta}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
              <span className="size-2 animate-pulse rounded-full bg-live" /> {note}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
