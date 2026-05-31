import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Wallet, User as UserIcon, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/cassino", label: "Cassino", icon: Search },
  { key: "deposit", label: "Depositar", icon: Wallet, primary: true },
  { to: "/torneios", label: "Torneios", icon: Trophy },
  { to: "/perfil", label: "Perfil", icon: UserIcon, auth: true },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { open } = useAuthDialog();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 h-16">
        {items.map((it) => {
          const active = "to" in it && path === it.to;
          const Icon = it.icon;
          const inner = (
            <span className={`flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold uppercase ${
              it.primary ? "text-primary-foreground" : active ? "text-primary" : "text-white/80"
            }`}>
              {it.primary ? (
                <span className="-mt-6 size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-brand">
                  <Icon className="size-6" />
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              <span className={it.primary ? "text-white" : ""}>{it.label}</span>
            </span>
          );
          if ("key" in it && it.key === "deposit") {
            return (
              <li key="dep">
                <button
                  className="w-full h-full"
                  onClick={() => (user ? open("deposit") : open("login"))}
                >
                  {inner}
                </button>
              </li>
            );
          }
          if (it.auth && !user) {
            return (
              <li key={it.label}>
                <button className="w-full h-full" onClick={() => open("login")}>{inner}</button>
              </li>
            );
          }
          return (
            <li key={it.label}>
              <Link to={it.to!} className="block w-full h-full">{inner}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
