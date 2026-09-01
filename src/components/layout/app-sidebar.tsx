import { Link, useRouterState } from "@tanstack/react-router";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import {
  Flame, Gamepad2, Rocket, MonitorPlay, LayoutGrid, Trophy, Gift,
  Users, ChevronDown, ChevronsLeft, Wallet, LifeBuoy,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

type Item = { label: string; to: string; icon: typeof Flame; q?: string };

const jogar: Item[] = [
  { label: "Populares", to: "/", icon: Flame },
  { label: "Cassino", to: "/cassino", icon: LayoutGrid },
  { label: "Slots", to: "/slots", icon: Gamepad2 },
  { label: "Crash", to: "/cassino", icon: Rocket, q: "crash" },
  { label: "Ao Vivo", to: "/ao-vivo", icon: MonitorPlay },
];

const extras: Item[] = [
  { label: "Torneios", to: "/torneios", icon: Trophy },
  { label: "Promoções", to: "/promocoes", icon: Gift },
  { label: "Indique e ganhe", to: "/indique-amigos", icon: Users },
];

function Row({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      search={item.q ? ({ q: item.q } as never) : undefined}
      title={item.label}
      className={cn(
        "slick group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold",
        collapsed && "justify-center px-0",
        active
          ? "bg-surface text-primary"
          : "text-foreground/70 hover:bg-surface/70 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function Group({
  title, items, path, collapsed,
}: { title: string; items: Item[]; path: string; collapsed: boolean }) {
  const [open, setOpen] = useState(true);
  if (collapsed) {
    return (
      <div className="space-y-1 px-2 py-2">
        {items.map((it) => (
          <Row key={it.label} item={it} active={path === it.to && !it.q} collapsed />
        ))}
      </div>
    );
  }
  return (
    <div className="border-t border-border px-2 py-2 first:border-t-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <span>{title}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} strokeWidth={2} />
      </button>
      {open && (
        <div className="space-y-1 pb-1">
          {items.map((it) => (
            <Row key={it.label} item={it} active={path === it.to && !it.q} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { open } = useAuthDialog();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-sidebar text-sidebar-foreground custom-scrollbar">
        {!collapsed && (
          <div className="flex items-center justify-between px-3 pb-1 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Navegar
            </span>
            <button
              onClick={toggleSidebar}
              className="slick grid size-7 place-items-center rounded-md border border-border text-foreground/70 hover:border-primary hover:text-primary"
              aria-label="Recolher menu"
            >
              <ChevronsLeft className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        )}

        <div className="px-2 pt-2">
          <button
            onClick={() => open("deposit")}
            title="Depositar"
            className={cn(
              "slick shine relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground hover:brightness-110",
              collapsed && "justify-center px-0",
            )}
          >
            <Wallet className="size-[18px] shrink-0" strokeWidth={2} />
            {!collapsed && <span>Depositar</span>}
          </button>
        </div>

        <div className="mt-2">
          <Group title="Jogar" items={jogar} path={path} collapsed={collapsed} />
          <Group title="Mais" items={extras} path={path} collapsed={collapsed} />
        </div>

        {!collapsed && (
          <div className="mt-auto border-t border-border p-3">
            <div className="panel-flat flex items-start gap-2.5 rounded-md p-3">
              <LifeBuoy className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-xs font-bold">Suporte 24h</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Atendimento por chat todos os dias.
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
