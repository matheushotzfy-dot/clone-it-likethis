import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { Gift, Wallet, User as UserIcon, LogOut, Menu, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

const nav = [
  { to: "/esportes", label: "Esportes" },
  { to: "/cassino", label: "Cassino" },
  { to: "/ao-vivo", label: "Ao Vivo" },
  { to: "/torneios", label: "Torneios" },
  { to: "/indique-amigos", label: "Clube X" },
  { to: "/promocoes", label: "Promoções" },
  { to: "/indique-amigos", label: "Indique Amigos" },
];

export function Header() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { open } = useAuthDialog();

  return (
    <header className="sticky top-0 z-40 w-full bg-brand">
      <div className="flex items-center h-16 px-3 md:px-6 gap-2">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-white p-2 -ml-2"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <nav className="hidden lg:flex items-center gap-1 ml-6 flex-1">
          {nav.map((n) => {
            const active = path === n.to || (n.to === "/cassino" && path === "/");
            return (
              <Link
                key={n.label}
                to={n.to}
                className={`px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                  active ? "text-primary" : "text-white/95 hover:text-primary"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 lg:flex-none" />
        {user ? (
          <>
            <div className="hidden sm:flex items-center gap-2 bg-brand-2 text-white rounded-full pl-2 pr-3 h-9 text-sm font-semibold">
              <span>R$ 0,00</span>
              <RefreshCw className="size-3.5 text-primary" />
            </div>
            <Button onClick={() => open("deposit")} className="font-bold uppercase">
              Depositar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="size-10 rounded-full bg-brand-2 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center text-white font-bold border-2 border-primary">
                  {user.email?.[0]?.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuItem asChild>
                  <Link to="/perfil"><UserIcon className="mr-2 size-4" />Meu Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => open("deposit")}>
                  <Wallet className="mr-2 size-4" />Depósito
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
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => open("promotions")}
              className="hidden sm:inline-flex items-center justify-center size-10 rounded-md text-primary hover:bg-white/10"
              aria-label="Promoções"
            >
              <Gift className="size-5" />
            </button>
            <button
              onClick={() => open("login")}
              className="h-10 px-5 rounded-md border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold uppercase text-sm transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => open("register")}
              className="h-10 px-5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-bold uppercase text-sm transition-all"
            >
              Registrar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
