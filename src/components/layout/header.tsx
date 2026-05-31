import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { Gift, Wallet, User as UserIcon, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";

const nav = [
  { to: "/esportes", label: "Esportes" },
  { to: "/cassino", label: "Cassino" },
  { to: "/ao-vivo", label: "Ao Vivo" },
  { to: "/torneios", label: "Torneios" },
  { to: "/promocoes", label: "Promoções" },
  { to: "/indique-amigos", label: "Indique Amigos" },
];

export function Header() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-40 w-full bg-sidebar border-b border-border">
      <div className="flex items-center h-14 px-3 md:px-4 gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-foreground p-2 -ml-2"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
          {nav.map((n) => {
            const active = path === n.to || (n.to === "/cassino" && path === "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                  active ? "text-primary" : "text-foreground/80 hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 lg:flex-none" />
        <Link to="/promocoes" className="hidden sm:inline-flex items-center justify-center size-9 rounded-md bg-surface hover:bg-surface-2 transition-colors" aria-label="Promoções">
          <Gift className="size-4 text-primary" />
        </Link>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface-2 rounded-md transition-colors">
                <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {user.email?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:inline text-sm font-medium">{user.email?.split("@")[0]}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/perfil"><UserIcon className="mr-2 size-4" />Meu Perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/deposito"><Wallet className="mr-2 size-4" />Depósito</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/saque">Saque</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/historico">Histórico</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="mr-2 size-4" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link to="/login">ENTRAR</Link>
            </Button>
            <Button asChild size="sm" className="font-bold">
              <Link to="/registro">REGISTRAR</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
