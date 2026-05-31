import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Volleyball, Dice5, Radio } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const sideItems = [
  { to: "/esportes", label: "Esportes", icon: Volleyball, side: "left" as const },
];
const rightItems = [
  { to: "/cassino", label: "Cassino", icon: Dice5 },
  { to: "/ao-vivo", label: "Ao vivo", icon: Radio, dot: true },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-bold ${
      active ? "text-primary" : "text-white/85"
    }`;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 h-16">
        <li>
          <button onClick={toggleSidebar} className="w-full h-full">
            <span className={itemClass(false)}>
              <Menu className="size-5" />
              <span>Menu</span>
            </span>
          </button>
        </li>
        {sideItems.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link to={it.to} className="block w-full h-full">
                <span className={itemClass(active)}>
                  <Icon className="size-5" />
                  <span>{it.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
        {/* Clube X centerpiece */}
        <li className="relative">
          <Link to="/indique-amigos" className="block w-full h-full">
            <span className="flex flex-col items-center justify-center gap-1 h-full">
              <span className="-mt-7 h-14 w-14 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-white font-extrabold text-[11px] flex flex-col items-center justify-center shadow-lg shadow-blue-900/50 border-4 border-brand">
                <span className="leading-none tracking-tight">CLUBE</span>
                <span className="text-2xl leading-none font-black -mt-0.5">X</span>
              </span>
            </span>
          </Link>
        </li>
        {rightItems.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link to={it.to} className="block w-full h-full">
                <span className={itemClass(active)}>
                  <span className="relative">
                    <Icon className="size-5" />
                    {it.dot && <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-destructive" />}
                  </span>
                  <span>{it.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
