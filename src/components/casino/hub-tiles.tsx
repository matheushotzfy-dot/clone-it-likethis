import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { IcCasino as Dices, IcSports as Trophy } from "@/components/icons/maxy-icons";
import casinoCover from "@/assets/maxy-casino-cover.webp";
import pixCover from "@/assets/maxy-pix-cover.webp";

/** Atalhos grandes Cassino / Esportes no topo do início (estilo hub). */
export function HubTiles() {
  const tiles = [
    { to: "/cassino", title: "Cassino", sub: "Slots, crash e mesas ao vivo", icon: Dices, img: casinoCover },
    { to: "/esportes", title: "Esportes", sub: "Futebol e NBA com odds ao vivo", icon: Trophy, img: pixCover },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ to, title, sub, icon: Icon, img }) => (
        <Link key={to} to={to}
          className="group relative flex h-28 overflow-hidden rounded-md bg-surface p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary sm:h-36">
          <img src={img} alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-2/3 object-cover opacity-40 transition-transform duration-500 group-hover:scale-105 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="relative mt-auto">
            <Icon className="mb-2 size-7 text-primary" />
            <p className="title-cond flex items-center gap-1 text-2xl sm:text-3xl">{title} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></p>
            <p className="hidden text-xs text-muted-foreground sm:block">{sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
