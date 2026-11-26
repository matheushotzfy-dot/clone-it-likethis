import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowDownToLine, ArrowUpFromLine, LifeBuoy, ShieldCheck } from "lucide-react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import {
  IcFire,
  IcSlots,
  IcCrash,
  IcLive,
  IcGrid,
  IcTrophy,
  IcGift,
  IcSports,
  type MaxyIcon,
} from "@/components/icons/maxy-icons";
import { ModeSwitch } from "./mode-switch";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useWallet } from "@/hooks/use-account";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  to: string;
  icon: MaxyIcon;
  search?: Record<string, string>;
  match: (path: string, search: Record<string, unknown>) => boolean;
};

const groups: { title: string; items: Item[] }[] = [
  {
    title: "Cassino",
    items: [
      { label: "Início", to: "/", icon: IcFire, match: (p) => p === "/" },
      {
        label: "Todos os jogos",
        to: "/cassino",
        icon: IcGrid,
        match: (p, s) => p === "/cassino" && !s.cat,
      },
      { label: "Slots", to: "/slots", icon: IcSlots, match: (p) => p === "/slots" },
      {
        label: "Crash",
        to: "/cassino",
        search: { cat: "crash" },
        icon: IcCrash,
        match: (p, s) => p === "/cassino" && s.cat === "crash",
      },
      { label: "Cassino ao vivo", to: "/ao-vivo", icon: IcLive, match: (p) => p === "/ao-vivo" },
    ],
  },
  {
    title: "Esportes",
    items: [
      {
        label: "Apostas esportivas",
        to: "/esportes",
        icon: IcSports,
        match: (p) => p === "/esportes",
      },
    ],
  },
  {
    title: "Mais",
    items: [
      { label: "Torneios", to: "/torneios", icon: IcTrophy, match: (p) => p === "/torneios" },
      { label: "Promoções", to: "/promocoes", icon: IcGift, match: (p) => p === "/promocoes" },
    ],
  },
];

function NavRow({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      search={item.search as never}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-[8px] px-3 text-[14.5px] font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-surface-2 text-foreground"
          : "text-foreground/70 hover:bg-surface hover:text-foreground",
      )}
    >
      {active && !collapsed && (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary" aria-hidden />
      )}
      <Icon
        className={cn("size-[19px] shrink-0", active ? "text-primary" : "text-muted-foreground")}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function WalletCard() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const wallet = useWallet();
  if (!user) {
    return (
      <div className="rounded-[12px] border border-border bg-surface p-3.5">
        <p className="text-[14px] font-semibold">Crie sua conta</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
          Cadastro com CPF em menos de um minuto.
        </p>
        <button
          type="button"
          onClick={() => open("register")}
          className="mt-3 h-9 w-full rounded-[8px] bg-primary text-[14px] font-bold text-primary-foreground hover:brightness-110"
        >
          Criar conta
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] border border-border bg-surface p-3.5">
      <p className="text-[12.5px] text-muted-foreground">Seu saldo</p>
      <p className="num font-display text-[26px] font-bold leading-tight">
        {wallet.data ? formatBRL(wallet.data.balance) : "–"}
      </p>
      {!!wallet.data?.held && (
        <p className="num text-[12px] text-muted-foreground">
          {formatBRL(wallet.data.held)} reservado em saque
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => open("deposit")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-pix text-[13.5px] font-bold text-pix-foreground hover:brightness-110"
        >
          <ArrowDownToLine className="size-4" /> Depositar
        </button>
        <Link
          to="/saque"
          className="flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-border text-[13.5px] font-semibold text-foreground/85 hover:border-foreground/30 hover:text-foreground"
        >
          <ArrowUpFromLine className="size-4" /> Sacar
        </Link>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const search = (location.search ?? {}) as Record<string, unknown>;

  // Fecha a gaveta do celular depois de navegar.
  useEffect(() => {
    setOpenMobile(false);
  }, [path, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="thin-scrollbar gap-0 bg-sidebar text-sidebar-foreground">
        {isMobile && (
          <div className="px-4 pb-1 pt-4">
            <Logo />
          </div>
        )}
        <div className={cn("space-y-3 p-3", collapsed && "px-1.5")}>
          <ModeSwitch compact={collapsed} />
          {!collapsed && <WalletCard />}
        </div>

        <nav aria-label="Menu" className={cn("space-y-4 px-3 pb-4", collapsed && "px-1.5")}>
          {groups.map((g) => (
            <div key={g.title}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[12.5px] font-semibold text-muted-foreground/80">
                  {g.title}
                </p>
              )}
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavRow
                    key={it.label}
                    item={it}
                    active={it.match(path, search)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="mt-auto space-y-1 border-t border-border p-3 text-[13px]">
            <Link
              to="/legal/jogo-responsavel"
              className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <ShieldCheck className="size-4" /> Jogo responsável
            </Link>
            <Link
              to="/legal/termos"
              className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <LifeBuoy className="size-4" /> Ajuda e termos
            </Link>
            <p className="px-3 pt-2 text-[12px] leading-snug text-muted-foreground/80">
              Proibido para menores de 18 anos.
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
