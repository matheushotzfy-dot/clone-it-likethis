import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, LayoutGrid, MonitorPlay, Plus, User } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const left = [
  { to: "/cassino", label: "Cassino", icon: LayoutGrid },
] as const;

const right = [
  { to: "/ao-vivo", label: "Ao vivo", icon: MonitorPlay },
] as const;

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { open } = useAuthDialog();
  const { user } = useAuth();

  const cell = (active: boolean) =>
    cn(
      "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
      active ? "text-primary" : "text-foreground/60",
    );

  const indicator = (active: boolean) => (
    <span
      className={cn(
        "absolute top-0 h-[2px] w-8 rounded-full bg-primary transition-all duration-300",
        active ? "opacity-100" : "w-0 opacity-0",
      )}
    />
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="grid h-16 grid-cols-5">
        <li>
          <button onClick={toggleSidebar} className="h-full w-full">
            <span className={cell(false)}>
              <Menu className="size-5" strokeWidth={1.75} />
              Menu
            </span>
          </button>
        </li>
        {left.map((it) => {
          const active = path === it.to;
          return (
            <li key={it.to}>
              <Link to={it.to} className="block h-full w-full">
                <span className={cell(active)}>
                  {indicator(active)}
                  <it.icon className="size-5" strokeWidth={1.75} />
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button onClick={() => open(user ? "deposit" : "register")} className="h-full w-full">
            <span className="flex h-full flex-col items-center justify-center gap-1">
              <span className="slick -mt-6 grid size-12 place-items-center rounded-xl border-4 border-background bg-primary text-primary-foreground">
                <Plus className="size-6" strokeWidth={2.5} />
              </span>
              <span className="-mt-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Depositar
              </span>
            </span>
          </button>
        </li>
        {right.map((it) => {
          const active = path === it.to;
          return (
            <li key={it.to}>
              <Link to={it.to} className="block h-full w-full">
                <span className={cell(active)}>
                  {indicator(active)}
                  <span className="relative">
                    <it.icon className="size-5" strokeWidth={1.75} />
                    <span className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-destructive soft-pulse" />
                  </span>
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          {user ? (
            <Link to="/perfil" className="block h-full w-full">
              <span className={cell(path === "/perfil")}>
                {indicator(path === "/perfil")}
                <User className="size-5" strokeWidth={1.75} />
                Perfil
              </span>
            </Link>
          ) : (
            <button onClick={() => open("login")} className="h-full w-full">
              <span className={cell(false)}>
                <User className="size-5" strokeWidth={1.75} />
                Entrar
              </span>
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}
