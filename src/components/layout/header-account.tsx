import { Link } from "@tanstack/react-router";
import { Wallet, User as UserIcon, LogOut, RefreshCw, Receipt, History, ShieldCheck, ArrowUpFromLine } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { cn } from "@/lib/utils";

export function HeaderAccount() {
  const { user, signOut } = useAuth();
  const { open } = useAuthDialog();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile, isFetching, refetch } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile(), enabled: !!user, staleTime: 20_000, refetchOnWindowFocus: false });
  const balance = Number(profile?.balance ?? 0);
  const isAdmin = !!profile?.isAdmin;
  const brl = (value: number) => value.toFixed(2).replace(".", ",");
  return <div className="header-account ml-auto flex min-w-0 shrink-0 items-center gap-1.5 md:gap-2">
          {user ? (
            <>
              <Button variant="ghost" aria-label="Atualizar saldo" title="Atualizar saldo"
                onClick={() => refetch()}
                className="flex h-10 min-w-0 max-w-28 flex-col items-start justify-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-left hover:bg-primary/15 sm:hidden">
                <span className="flex w-full items-center justify-between gap-2 text-[8px] font-semibold uppercase text-muted-foreground">Saldo <RefreshCw className={cn("size-2.5 shrink-0 text-primary", isFetching && "animate-spin")} /></span>
                <span className="block max-w-full truncate text-[12px] font-extrabold leading-none tabular-nums text-foreground"><span className="text-primary">R$</span> {brl(balance)}</span>
              </Button>
              <div className="hidden sm:flex h-9 shrink-0 items-center gap-1 rounded-md border border-border bg-surface pl-2 pr-1 md:h-10 md:pl-3">
                <span className="flex flex-col leading-none">
                  <span className="text-[9px] font-medium text-muted-foreground">
                    Saldo
                  </span>
                  <span className="whitespace-nowrap text-[12px] font-bold tabular-nums text-foreground md:text-sm">
                    <span className="text-primary">R$</span> {brl(balance)}
                  </span>
                </span>
                <Button variant="ghost" size="icon"
                  onClick={() => { qc.invalidateQueries({ queryKey: ["my-profile"] }); refetch(); }}
                  className="slick hidden size-7 shrink-0 sm:grid place-items-center rounded-md border border-primary/40 bg-primary/12 text-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="Atualizar saldo"
                >
                  <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} strokeWidth={2.2} />
                </Button>
              </div>

              <Link
                to="/saque"
                className="slick hidden h-9 items-center gap-1.5 rounded-md border border-primary/60 px-3 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground sm:inline-flex md:h-10 md:px-4"
              >
                <ArrowUpFromLine className="size-4" strokeWidth={1.75} /> Sacar
              </Link>

              <Button
                onClick={() => open("deposit")}
                aria-label="Depositar"
                className="slick shine relative h-9 w-9 overflow-hidden rounded-md bg-primary p-0 text-xs font-bold text-primary-foreground hover:brightness-110 sm:w-auto sm:px-3 md:h-10 md:px-4"
              >
                <Wallet className="size-4 sm:hidden" /><span className="hidden sm:inline">Depositar</span>
              </Button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" aria-label="Menu da conta" className="slick grid size-9 p-0 place-items-center rounded-md border border-border bg-surface text-sm font-bold hover:border-primary md:size-10">
                    {(profile?.username?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                  </Button>
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
              <Button
                variant="ghost" onClick={() => open("login") }
                className="slick h-9 whitespace-nowrap rounded-md border border-border px-3 text-xs font-bold text-foreground/85 hover:border-primary hover:text-primary md:h-10 md:px-4"
              >
                Entrar
              </Button>
              <Button
                onClick={() => open("register")}
                className="slick shine relative h-9 overflow-hidden whitespace-nowrap rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:brightness-110 md:h-10 md:px-4"
              >
                Cadastrar
              </Button>
            </>
          )}
  </div>;
}
