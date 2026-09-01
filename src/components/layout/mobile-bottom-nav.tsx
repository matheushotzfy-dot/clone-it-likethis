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
      "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors",
      active ? "text-primary" : "text-foreground/55",
    );

  const indicator = (active: boolean) => (
    <span
      className={cn(
        "absolute top-0 h-[3px] rounded-full bg-primary transition-all duration-300",
        active ? "w-9 opacity-100 shadow-[0_0_12px_var(--primary)]" : "w-0 opacity-0",
      )}
    />
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background/80 to-transparent" />
      <ul className="grid h-16 grid-cols-5">
        <li>
          <button onClick={toggleSidebar} className="h-full w-full" aria-label="Abrir menu">
            <span className={cell(false)}>
              <Menu className="size-[22px]" strokeWidth={2} />
              Menu
            </span>
          </button>
        </li>

        <li>
          <Link to="/cassino" className="block h-full w-full">
            <span className={cell(path === "/cassino")}>
              {indicator(path === "/cassino")}
              <LayoutGrid className="size-[22px]" strokeWidth={2} />
              Cassino
            </span>
          </Link>
        </li>

        <li>
          <button
            onClick={() => open(user ? "deposit" : "register")}
            className="h-full w-full"
            aria-label={user ? "Depositar" : "Criar conta"}
          >
            <span className="flex h-full flex-col items-center justify-center gap-1">
              <span className="slick ring-pulse cat-slots -mt-7 grid size-14 place-items-center rounded-2xl border-4 border-background bg-primary text-primary-foreground cta-glow">
                <Plus className="size-7" strokeWidth={3} />
              </span>
              <span className="-mt-1 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                Depositar
              </span>
            </span>
          </button>
        </li>

        <li>
          <Link to="/ao-vivo" className="block h-full w-full">
            <span className={cell(path === "/ao-vivo")}>
              {indicator(path === "/ao-vivo")}
              <span className="relative">
                <MonitorPlay className="size-[22px]" strokeWidth={2} />
                <span className="soft-pulse absolute -right-1 -top-0.5 size-2 rounded-full bg-destructive" />
              </span>
              Ao vivo
            </span>
          </Link>
        </li>

        <li>
          {user ? (
            <Link to="/perfil" className="block h-full w-full">
              <span className={cell(path === "/perfil")}>
                {indicator(path === "/perfil")}
                <User className="size-[22px]" strokeWidth={2} />
                Perfil
              </span>
            </Link>
          ) : (
            <button onClick={() => open("login")} className="h-full w-full">
              <span className={cell(false)}>
                <User className="size-[22px]" strokeWidth={2} />
                Entrar
              </span>
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}
