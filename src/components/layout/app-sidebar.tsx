import { Link, useRouterState } from "@tanstack/react-router";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { ChevronDown, ChevronsLeft, ShieldCheck } from "lucide-react";
import {
  IcFire as Flame, IcSlots as Gamepad2, IcCrash as Rocket, IcLive as MonitorPlay, IcGrid as LayoutGrid,
  IcTrophy as Trophy, IcGift as Gift, IcSports as Cup, IcLive as Radio, IcPix as Wallet, type MaxyIcon,
} from "@/components/icons/maxy-icons";
import { ModeSwitch } from "./mode-switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

type Item = { label: string; to: string; icon: MaxyIcon; cat?: string };

const jogar: Item[] = [
  { label: "Populares", to: "/", icon: Flame },
  { label: "Cassino", to: "/cassino", icon: LayoutGrid },
  { label: "Slots", to: "/slots", icon: Gamepad2 },
  { label: "Crash", to: "/cassino", icon: Rocket, cat: "crash" },
  { label: "Ao Vivo", to: "/ao-vivo", icon: MonitorPlay },
];

const esportes: Item[] = [
  { label: "Esportes", to: "/esportes", icon: Cup },
  { label: "Ao vivo agora", to: "/esportes", icon: Radio, cat: "live" },
];

const extras: Item[] = [
  { label: "Torneios", to: "/torneios", icon: Trophy },
  { label: "Promoções", to: "/promocoes", icon: Gift },
];

function Row({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      search={item.cat ? ({ cat: item.cat } as never) : undefined}
      title={item.label}
      className={cn(
        "slick group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-semibold",
        collapsed && "justify-center px-0",
        active
          ? "bg-surface-2 text-foreground"
          : "text-foreground/70 hover:bg-surface/70 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "hidden",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
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
          <Row key={it.label} item={it} active={path === it.to && !it.cat} collapsed />
        ))}
      </div>
    );
  }
  return (
    <div className="mx-2 my-2 rounded-lg bg-surface/60 p-1.5">
      <Button variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1 py-2 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <span>{title}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} strokeWidth={2} />
      </Button>
      {open && (
        <div className="space-y-1 pb-1">
          {items.map((it) => (
            <Row key={it.label} item={it} active={path === it.to && !it.cat} collapsed={false} />
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
        <div className={cn("flex items-center px-3 pb-1 pt-3", collapsed ? "justify-center px-0" : "justify-between")}>
          {!collapsed && (
            <span className="text-[11px] font-semibold text-muted-foreground">Explorar</span>
          )}
          <Button variant="ghost"
            onClick={toggleSidebar}
            className="slick grid size-7 place-items-center rounded-md border border-border p-0 text-foreground/70 hover:border-primary hover:text-primary"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} strokeWidth={1.75} />
          </Button>
        </div>

        <div className="space-y-2 px-2 pt-2">
          <ModeSwitch compact={collapsed} />
          <Button variant="ghost"
            onClick={() => open("deposit")}
            title="Depositar"
            className={cn(
              "relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-[4px] bg-primary px-3 font-display text-[15px] font-extrabold uppercase tracking-wide text-primary-foreground hover:brightness-110",
              collapsed && "justify-center px-0",
            )}
          >
            <Wallet className="size-[18px] shrink-0" />
            {!collapsed && <span>Depositar</span>}
          </Button>
        </div>

        <div className="mt-2">
          <Group title="Jogar" items={jogar} path={path} collapsed={collapsed} />
          <Group title="Esportes" items={esportes} path={path} collapsed={collapsed} />
          <Group title="Mais" items={extras} path={path} collapsed={collapsed} />
        </div>

        {!collapsed && (
          <div className="mt-auto border-t border-border p-3">
            <Link to="/legal/jogo-responsavel" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ShieldCheck className="size-4" /> Jogo responsável · 18+</Link>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
