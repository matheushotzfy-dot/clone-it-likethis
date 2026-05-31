import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Target, Trophy, Gift, CircleDot, Ticket, Flame, Dices, Rocket, Zap } from "lucide-react";

const quick = [
  { title: "Missões", url: "/promocoes", icon: Target },
  { title: "Torneios", url: "/torneios", icon: Trophy },
  { title: "Resgatar", url: "/promocoes", icon: Gift },
  { title: "Roleta", url: "/ao-vivo", icon: CircleDot },
  { title: "Bolões", url: "/esportes", icon: Ticket },
];

const games = [
  { title: "Fortune Tiger", url: "/cassino", icon: Flame },
  { title: "Aviator", url: "/cassino", icon: Rocket },
  { title: "Spaceman", url: "/cassino", icon: Rocket },
  { title: "Mines", url: "/cassino", icon: Dices },
  { title: "JetX", url: "/cassino", icon: Zap },
];

const legais = [
  { title: "Termos", url: "/legal/termos" },
  { title: "Privacidade", url: "/legal/privacidade" },
  { title: "Jogo Responsável", url: "/legal/jogo-responsavel" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => path === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel>Atalhos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quick.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cassino Popular</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {games.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4 text-primary" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ligas Esportivas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {["Brasileirão", "La Liga", "Premier League", "Serie A", "Champions"].map((l) => (
                <SidebarMenuItem key={l}>
                  <SidebarMenuButton asChild>
                    <Link to="/esportes" className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                      {!collapsed && <span className="text-sm">{l}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Legal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legais.map((l) => (
                <SidebarMenuItem key={l.title}>
                  <SidebarMenuButton asChild>
                    <Link to={l.url}>
                      {!collapsed && <span className="text-xs">{l.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
