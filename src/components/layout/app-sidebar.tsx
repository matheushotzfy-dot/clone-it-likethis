import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Target, Trophy, Gift, Compass, Ticket, ChevronDown, ChevronLeft, Circle } from "lucide-react";
import { useState } from "react";

const bigButtons = [
  { title: "Missões", url: "/promocoes", icon: Target, gradient: "from-violet-600 to-indigo-700" },
  { title: "Torneios", url: "/torneios", icon: Trophy, gradient: "from-pink-500 to-purple-700" },
  { title: "Resgatar", url: "/promocoes", icon: Gift, gradient: "from-orange-400 to-yellow-500" },
  { title: "Roleta", url: "/ao-vivo", icon: Compass, gradient: "from-green-500 to-emerald-600" },
  { title: "Bolões", url: "/esportes", icon: Ticket, gradient: "from-orange-500 via-red-500 to-pink-500" },
];

const esportes: { label: string; slug: string }[] = [
  { label: "Copa do Mundo FIFA", slug: "fifa.world" },
  { label: "Mundial de Clubes", slug: "fifa.cwc" },
  { label: "Brasileirão Série A", slug: "bra.1" },
  { label: "Brasileirão Série B", slug: "bra.2" },
  { label: "Copa do Brasil", slug: "bra.copa_do_brazil" },
  { label: "Libertadores", slug: "conmebol.libertadores" },
  { label: "Sul-Americana", slug: "conmebol.sudamericana" },
  { label: "Champions League", slug: "uefa.champions" },
  { label: "Premier League", slug: "eng.1" },
  { label: "La Liga", slug: "esp.1" },
];
const cassino = ["Slots", "Crash", "Ao Vivo", "Mesas", "Bingo"];
const promocoes = ["Boas-vindas", "Cashback", "Indique e Ganhe"];

function EsportesSection() {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-white/10 px-3 py-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-white font-bold text-sm py-2">
        <span>Esportes</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <ul className="space-y-0.5 pb-2">
          {esportes.map((it) => (
            <li key={it.slug}>
              <Link
                to="/esportes"
                search={{ liga: it.slug }}
                className="flex items-center gap-2 text-white/85 hover:text-primary hover:bg-white/5 text-sm py-1.5 px-2 rounded-md transition-colors"
              >
                <Circle className="size-3 opacity-60" />
                <span className="truncate">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-white/10 px-3 py-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-white font-bold text-sm py-2">
        <span>{title}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <ul className="space-y-0.5 pb-2">
          {items.map((it) => (
            <li key={it}>
              <Link to="/esportes" className="flex items-center gap-2 text-white/85 hover:text-primary hover:bg-white/5 text-sm py-1.5 px-2 rounded-md transition-colors">
                <Circle className="size-3 opacity-60" />
                <span>{it}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-brand text-white">
        {!collapsed && (
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs uppercase font-bold tracking-wide text-white/90">Divirta-se com</span>
            <button onClick={toggleSidebar} className="size-6 rounded bg-brand-2 hover:bg-primary hover:text-primary-foreground flex items-center justify-center">
              <ChevronLeft className="size-4" />
            </button>
          </div>
        )}

        <div className="px-2 space-y-2">
          {bigButtons.map((b) => {
            const active = path === b.url;
            return (
              <Link
                key={b.title}
                to={b.url}
                className={`flex items-center justify-between gap-2 px-3 h-12 rounded-xl bg-gradient-to-r ${b.gradient} text-white font-bold shadow-md hover:brightness-110 transition-all ${active ? "ring-2 ring-primary" : ""}`}
              >
                {!collapsed && <span className="text-sm">{b.title}</span>}
                <b.icon className="size-5 ml-auto" />
              </Link>
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-3">
            <EsportesSection />
            <Section title="Cassino" items={cassino} />
            <Section title="Promoções" items={promocoes} />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
