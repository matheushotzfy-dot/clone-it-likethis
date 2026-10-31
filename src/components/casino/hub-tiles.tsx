import { Link } from "@tanstack/react-router";
import { IcCasino, IcSports } from "@/components/icons/maxy-icons";
import casinoArt from "@/assets/casino-banner-v2.png.asset.json";
import sportsArt from "@/assets/sports-banner-v2.png.asset.json";

/** Two large hub cards (Cassino / Esportes) with artwork and a footer action bar. */
export function HubTiles() {
  const tiles = [
    { to: "/cassino", title: "Cassino", cta: "Jogar agora", note: "Slots, crash e ao vivo", icon: IcCasino, img: casinoArt.url },
    { to: "/esportes", title: "Esportes", cta: "Apostar agora", note: "Odds ao vivo", icon: IcSports, img: sportsArt.url },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
      {tiles.map(({ to, title, cta, note, icon: Icon, img }) => (
        <Link key={to} to={to}
          className="group min-w-0 overflow-hidden rounded-lg bg-surface transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
          <div className="relative aspect-[2.6/1] overflow-hidden">
            <img src={img} alt={title} width={900} height={346} fetchPriority="high"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            <h2 className="sr-only">{title}</h2>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 px-2 py-2 sm:px-4 sm:py-3 md:px-5">
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold sm:gap-2 sm:text-sm md:text-base">
              <Icon className="size-3.5 shrink-0 text-foreground/80 sm:size-5" /> <span className="truncate">{cta}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
              <span className="size-2 animate-pulse rounded-full bg-live" /> {note}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
