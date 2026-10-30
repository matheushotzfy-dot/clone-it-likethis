import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, LayoutGrid, MonitorPlay, Plus, User } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { open } = useAuthDialog();
  const { user } = useAuth();

  const cell = (active: boolean) =>
    cn(
      "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
      active ? "text-primary" : "text-foreground/55",
    );

  const indicator = (active: boolean) => (
    <span
      className={cn(
        "absolute top-0 h-[3px] rounded-full bg-primary transition-all duration-300",
        active ? "w-9 opacity-100 " : "w-0 opacity-0",
      )}
    />
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background/80 to-transparent" />
      <ul className="grid h-16 grid-cols-5">
        <li>
          <Button variant="ghost" onClick={toggleSidebar} className="h-full w-full rounded-none p-0" aria-label="Abrir menu">
            <span className={cell(false)}>
              <Menu className="size-[22px]" strokeWidth={2} />
              Menu
            </span>
          </Button>
        </li>

        <li>
          <Link to="/cassino" className="block h-full w-full rounded-none p-0">
            <span className={cell(path === "/cassino")}>
              {indicator(path === "/cassino")}
              <LayoutGrid className="size-[22px]" strokeWidth={2} />
              Cassino
            </span>
          </Link>
        </li>

        <li>
          <Button variant="ghost"
            onClick={() => open(user ? "deposit" : "register")}
            className="h-full w-full rounded-none p-0"
            aria-label={user ? "Depositar" : "Criar conta"}
          >
            <span className="flex h-full flex-col items-center justify-center gap-0.5">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground cta-glow">
                <Plus className="size-5" strokeWidth={3} />
              </span>
              <span className="text-[10px] font-semibold text-primary">
                Depositar
              </span>
            </span>
          </Button>
        </li>

        <li>
          <Link to="/esportes" className="block h-full w-full rounded-none p-0">
            <span className={cell(path === "/esportes")}>
              {indicator(path === "/esportes")}
              <span className="relative">
                <MonitorPlay className="size-[22px]" strokeWidth={2} />
                <span className="soft-pulse absolute -right-1 -top-0.5 size-2 rounded-full bg-live" />
              </span>
              Esportes
            </span>
          </Link>
        </li>

        <li>
          {user ? (
            <Link to="/perfil" className="block h-full w-full rounded-none p-0">
              <span className={cell(path === "/perfil")}>
                {indicator(path === "/perfil")}
                <User className="size-[22px]" strokeWidth={2} />
                Perfil
              </span>
            </Link>
          ) : (
            <Button variant="ghost" onClick={() => open("login")} className="h-full w-full rounded-none p-0">
              <span className={cell(false)}>
                <User className="size-[22px]" strokeWidth={2} />
                Entrar
              </span>
            </Button>
          )}
        </li>
      </ul>
    </nav>
  );
}
