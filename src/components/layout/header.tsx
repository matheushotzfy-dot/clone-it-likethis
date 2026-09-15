import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet, User as UserIcon, LogOut, Menu, RefreshCw, Receipt, History,
  ShieldCheck, ArrowUpFromLine, Search,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Início" },
  { to: "/cassino", label: "Cassino" },
  { to: "/slots", label: "Slots" },
  { to: "/ao-vivo", label: "Ao Vivo" },
  { to: "/torneios", label: "Torneios" },
  { to: "/promocoes", label: "Promoções" },
] as const;

function brl(n: number) {
  return n.toFixed(2).replace(".", ",");
}

export function Header() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { open } = useAuthDialog();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
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

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate({ to: "/cassino", search: { q } as never });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center gap-2 overflow-hidden px-2 md:h-16 md:gap-3 md:px-5">
        <button
          onClick={toggleSidebar}
          className="slick -ml-1 grid size-9 place-items-center rounded-md text-foreground/80 hover:bg-surface hover:text-foreground lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>

        <Logo />

        <nav className="no-scrollbar ml-1 hidden min-w-0 shrink items-center gap-0.5 overflow-x-auto lg:flex xl:ml-3">
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "slick group relative flex h-10 items-center whitespace-nowrap px-2.5 text-[12.5px] font-extrabold tracking-tight xl:px-3",
                  active ? "text-primary" : "text-foreground/65 hover:text-foreground",
                )}
              >
                {n.label}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-1.5 bottom-1 h-[2px] origin-left rounded-full bg-primary transition-transform duration-200 ease-out",
                    active
                      ? "scale-x-100 shadow-[0_0_10px_1px_color-mix(in_srgb,var(--primary)_60%,transparent)]"
                      : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <form onSubmit={submitSearch} className="relative ml-auto hidden shrink-0 xl:block xl:w-56 2xl:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar jogo…"
            aria-label="Buscar jogo"
            className="h-9 w-full rounded-md border border-border bg-surface/70 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </form>

        <div className="ml-auto flex min-w-0 shrink items-center gap-1.5 md:gap-2 xl:ml-3">
          {user ? (
            <>
              <div className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-border bg-surface/70 pl-2.5 pr-1 md:h-10 md:pl-3">
                <span className="flex flex-col leading-none">
                  <span className="hidden text-[8.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground md:block">
                    Saldo
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-extrabold tabular-nums text-foreground md:text-[15px]">
                    <span className="text-primary">R$</span> {brl(balance)}
                  </span>
                </span>
                <button
                  onClick={() => { qc.invalidateQueries({ queryKey: ["my-profile"] }); refetch(); }}
                  className="slick grid size-7 shrink-0 place-items-center rounded-[7px] border border-primary/40 bg-primary/12 text-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="Atualizar saldo"
                >
                  <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} strokeWidth={2.2} />
                </button>
              </div>

              <Link
                to="/saque"
                className="slick hidden h-9 items-center gap-1.5 rounded-md border border-primary/60 px-3 text-xs font-bold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground sm:inline-flex md:h-10 md:px-4"
              >
                <ArrowUpFromLine className="size-4" strokeWidth={1.75} /> Sacar
              </Link>

              <button
                onClick={() => open("deposit")}
                className="slick shine relative h-9 overflow-hidden rounded-md bg-primary px-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:brightness-110 md:h-10 md:px-5"
              >
                Depositar
              </button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="slick grid size-9 place-items-center rounded-md border border-border bg-surface text-sm font-bold hover:border-primary md:size-10">
                    {(profile?.username?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
                  <div className="mb-1 border-b border-border px-2 py-2">
                    <div className="truncate text-sm font-bold">{profile?.full_name || profile?.username || user.email}</div>
                    <div className="text-xs font-bold text-primary">R$ {brl(balance)}</div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/perfil"><UserIcon className="mr-2 size-4" strokeWidth={1.75} />Meu Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => open("deposit")}>
                    <Wallet className="mr-2 size-4" strokeWidth={1.75} />Depósito
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/saque"><Receipt className="mr-2 size-4" strokeWidth={1.75} />Saque</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/historico"><History className="mr-2 size-4" strokeWidth={1.75} />Histórico</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin"><ShieldCheck className="mr-2 size-4 text-primary" strokeWidth={1.75} />Painel Admin</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                    <LogOut className="mr-2 size-4" strokeWidth={1.75} />Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <button
                onClick={() => open("login")}
                className="slick h-9 whitespace-nowrap rounded-md border border-border px-3 text-xs font-bold uppercase tracking-wide text-foreground/85 hover:border-primary hover:text-primary md:h-10 md:px-5"
              >
                Entrar
              </button>
              <button
                onClick={() => open("register")}
                className="slick shine relative h-9 overflow-hidden whitespace-nowrap rounded-md bg-primary px-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:brightness-110 md:h-10 md:px-5"
              >
                Cadastrar
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
