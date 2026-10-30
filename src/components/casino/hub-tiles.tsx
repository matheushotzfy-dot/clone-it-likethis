import { Link } from "@tanstack/react-router";
import { Dices, Trophy, ArrowRight } from "lucide-react";
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
          className="group relative flex h-28 overflow-hidden rounded-xl bg-surface p-4 ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-primary/60 focus-visible:outline-2 focus-visible:outline-primary sm:h-36">
          <img src={img} alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-2/3 object-cover opacity-40 transition-transform duration-500 group-hover:scale-105 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="relative mt-auto">
            <span className="mb-2 grid size-9 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="size-5" /></span>
            <p className="flex items-center gap-1 text-base font-bold sm:text-lg">{title} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></p>
            <p className="hidden text-xs text-muted-foreground sm:block">{sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
