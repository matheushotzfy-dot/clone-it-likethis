import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, User as UserIcon, LogOut, Menu, RefreshCw, Bell, Receipt, History, ShieldCheck, ArrowUpFromLine } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";

type NavLink = { to: string; label: string };
type NavAction = { label: string; action: "deposit" };

const nav: (NavLink | NavAction)[] = [
  { to: "/esportes", label: "Esportes" },
  { to: "/cassino", label: "Cassino" },
  { to: "/ao-vivo", label: "Ao Vivo" },
  { to: "/torneios", label: "Torneios" },
  { label: "Depósito", action: "deposit" },
  { to: "/promocoes", label: "Promoções" },
];

export function Header() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { open } = useAuthDialog();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile, isFetching, refetch } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const balance = Number(profile?.balance ?? 0);
  const isAdmin = !!profile?.isAdmin;

  return (
    <header className="sticky top-0 z-40 w-full bg-brand shadow-sm overflow-x-clip">
      <div className="flex items-center h-14 md:h-16 px-2 md:px-6 gap-1.5 md:gap-2 min-w-0">

        <button
          onClick={toggleSidebar}
          className="lg:hidden text-white p-2 -ml-1 hover:bg-white/10 rounded-md"
          aria-label="Menu"
        >
          <Menu className="size-6" />
        </button>
        <Logo />
        <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
          {nav.map((n) => {
            if ("action" in n) {
              return (
                <button
                  key={n.label}
                  onClick={() => open(n.action)}
                  className="relative px-3 py-5 text-sm font-bold uppercase tracking-wide transition-colors text-primary hover:text-primary/80"
                >
                  {n.label}
                </button>
              );
            }
            const active = path === n.to || (n.to === "/cassino" && path === "/");
            return (
              <Link
                key={n.label}
                to={n.to}
                className={`relative px-3 py-5 text-sm font-bold uppercase tracking-wide transition-colors ${
                  active ? "text-primary" : "text-white/95 hover:text-primary"
                }`}
              >
                {n.label}
                {active && <span className="absolute bottom-2 left-3 right-3 h-0.5 bg-primary rounded-full" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 lg:flex-none" />
        {user ? (
          <>
            <div className="hidden md:flex items-center gap-2 bg-brand-2 text-white rounded-full pl-3 pr-1 h-9 text-sm font-bold">
              <span>R$ {balance.toFixed(2).replace(".", ",")}</span>
              <button
                onClick={() => { qc.invalidateQueries({ queryKey: ["my-profile"] }); refetch(); }}
                className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110"
                aria-label="Atualizar saldo"
              >
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
            <Link
              to="/saque"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 md:h-10 px-3 md:px-4 rounded-md border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold uppercase text-xs md:text-sm transition-colors"
            >
              <ArrowUpFromLine className="size-4" /> Sacar
            </Link>
            <button
              onClick={() => open("deposit")}
              className="h-9 md:h-10 px-3 md:px-5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-bold uppercase text-xs md:text-sm transition-all"
            >
              Depositar
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative size-9 md:size-10 rounded-full bg-brand-2 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center text-white font-bold border-2 border-primary text-sm">
                  {(profile?.username?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center pointer-events-none">
                    1
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <div className="px-2 py-2 border-b border-border mb-1">
                  <div className="text-sm font-bold truncate">{profile?.full_name || profile?.username || user.email}</div>
                  <div className="text-xs text-primary font-bold">R$ {balance.toFixed(2).replace(".", ",")}</div>
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/perfil"><UserIcon className="mr-2 size-4" />Meu Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => open("deposit")}>
                  <Wallet className="mr-2 size-4" />Depósito
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/saque"><Receipt className="mr-2 size-4" />Saque</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/historico"><History className="mr-2 size-4" />Histórico</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 size-4" />Notificações
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><ShieldCheck className="mr-2 size-4 text-primary" />Painel Admin</Link>
                    </DropdownMenuItem>
                  </>
                )}
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
              onClick={() => open("login")}
              className="h-9 md:h-10 px-3 md:px-5 rounded-md border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold uppercase text-xs md:text-sm transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => open("register")}
              className="h-9 md:h-10 px-3 md:px-5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-bold uppercase text-xs md:text-sm transition-all"
            >
              Registrar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
