import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  LogOut,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useProfile, useWallet } from "@/hooks/use-account";
import { formatAmount, formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Pisca o saldo em verde-água quando ele muda (depósito, ganho). */
function useTick(value: number | undefined) {
  const prev = useRef(value);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (value !== undefined && prev.current !== undefined && value > prev.current)
      setTick((t) => t + 1);
    prev.current = value;
  }, [value]);
  return tick;
}

export function HeaderAccount() {
  const { user, signOut } = useAuth();
  const { open } = useAuthDialog();
  const wallet = useWallet();
  const profile = useProfile();
  const balance = wallet.data?.balance;
  const tick = useTick(balance);

  if (!user) {
    return (
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => open("login")}
          className="h-10 rounded-[10px] px-4 font-semibold text-foreground/85 hover:bg-surface-2 hover:text-foreground"
        >
          Entrar
        </Button>
        <Button
          onClick={() => open("register")}
          className="h-10 rounded-[10px] px-4 font-bold shadow-none"
        >
          Criar conta
        </Button>
      </div>
    );
  }

  const name =
    profile.data?.full_name?.split(" ")[0] ||
    profile.data?.username ||
    user.email?.split("@")[0] ||
    "Conta";
  const initial = name[0]?.toUpperCase() ?? "U";

  return (
    <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
      {/* Saldo + depositar formam um controle só */}
      <div className="flex h-10 min-w-0 items-stretch overflow-hidden rounded-[10px] border border-border bg-background">
        <button
          type="button"
          onClick={() => wallet.refetch()}
          title="Atualizar saldo"
          className="flex min-w-0 items-center gap-1.5 px-3 text-left transition-colors hover:bg-surface"
        >
          <span className="text-[12px] font-semibold text-muted-foreground">R$</span>
          <span
            key={tick}
            className={cn(
              "num truncate font-display text-[19px] font-bold leading-none",
              tick > 0 && "balance-tick",
            )}
          >
            {balance === undefined ? "–" : formatAmount(balance)}
          </span>
          <RefreshCw
            className={cn(
              "hidden size-3.5 shrink-0 text-muted-foreground sm:block",
              wallet.isFetching && "animate-spin",
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => open("deposit")}
          className="flex items-center gap-1.5 bg-pix px-3 text-[14px] font-bold text-pix-foreground transition-[filter] hover:brightness-110"
        >
          <ArrowDownToLine className="size-4" />
          <span className="hidden sm:inline">Depositar</span>
        </button>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menu da conta"
            className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-border bg-surface font-display text-[17px] font-bold transition-colors hover:border-primary"
          >
            {initial}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 rounded-[12px] border-border bg-popover p-1.5"
        >
          <DropdownMenuLabel className="px-2.5 py-2 font-normal">
            <p className="truncate text-[14px] font-semibold">{profile.data?.full_name || name}</p>
            <p className="num mt-0.5 text-[13px] text-muted-foreground">
              Saldo {balance === undefined ? "–" : formatBRL(balance)}
            </p>
            {!!wallet.data?.held && (
              <p className="num text-[12px] text-muted-foreground">
                {formatBRL(wallet.data.held)} reservado em saque
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/perfil">
              <UserIcon /> Minha conta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open("deposit")}>
            <ArrowDownToLine /> Depositar
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/saque">
              <ArrowUpFromLine /> Sacar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/historico">
              <History /> Extrato
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/historico" search={{ aba: "esportes" } as never}>
              <Ticket /> Minhas apostas
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/perfil" search={{ aba: "limites" } as never}>
              <SlidersHorizontal /> Limites de jogo
            </Link>
          </DropdownMenuItem>
          {profile.data?.isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <ShieldCheck className="text-primary" /> Painel admin
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
