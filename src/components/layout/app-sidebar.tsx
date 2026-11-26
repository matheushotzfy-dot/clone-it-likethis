import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Gauge,
  Receipt,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import {
  IcFire,
  IcSlots,
  IcCrash,
  IcLive,
  IcGrid,
  IcGift,
  IcSports,
  type MaxyIcon,
} from "@/components/icons/maxy-icons";
import { ModeSwitch } from "./mode-switch";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useWallet } from "@/hooks/use-account";
import { useLobbyCounts, useProviders } from "@/hooks/use-games";
import { getSportsEvents, LEAGUES } from "@/lib/sports.functions";
import { GAME_KINDS } from "@/lib/game-kinds";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = Record<string, unknown>;

/* ---------------------------------------------------------------------------
   Linhas do menu
   --------------------------------------------------------------------------- */

function NavRow({
  to,
  search,
  label,
  icon,
  count,
  active,
  collapsed,
  trailing,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  icon?: ReactNode;
  count?: number;
  active: boolean;
  collapsed: boolean;
  trailing?: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={(search ?? {}) as never}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "side-row",
        collapsed && "justify-center px-0",
        active ? "side-row-active" : "text-foreground/72 hover:bg-surface hover:text-foreground",
      )}
    >
      {active && !collapsed && <span className="side-row-bar" aria-hidden />}
      {icon}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && trailing}
      {!collapsed && count !== undefined && count > 0 && (
        <span className="num side-count">{count.toLocaleString("pt-BR")}</span>
      )}
    </Link>
  );
}

/** Linha filha (subcategoria, liga), recuada e sem ícone. */
function SubRow({
  to,
  search,
  label,
  count,
  active,
  trailing,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  count?: number;
  active: boolean;
  trailing?: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={(search ?? {}) as never}
      aria-current={active ? "page" : undefined}
      className={cn(
        "side-sub",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={cn("side-sub-dot", active && "bg-primary")} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
      {count !== undefined && count > 0 && (
        <span className="num side-count">{count.toLocaleString("pt-BR")}</span>
      )}
    </Link>
  );
}

function Group({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-2 my-2 border-t border-border" aria-hidden />
      ) : (
        <p className="side-group-title">{title}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

const icon = (Icon: MaxyIcon, active: boolean) => (
  <Icon className={cn("size-[19px] shrink-0", active ? "text-primary" : "text-muted-foreground")} />
);

/* ---------------------------------------------------------------------------
   Carteira
   --------------------------------------------------------------------------- */

function WalletCard() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const wallet = useWallet();
  if (!user) {
    return (
      <div className="rounded-[12px] border border-border bg-surface p-3.5">
        <p className="text-[14px] font-semibold">Crie sua conta</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
          Cadastro com CPF em menos de um minuto. Depósito e saque por Pix.
        </p>
        <button
          type="button"
          onClick={() => open("register")}
          className="mt-3 h-9 w-full rounded-[8px] bg-primary text-[14px] font-bold text-primary-foreground hover:brightness-110"
        >
          Criar conta
        </button>
        <button
          type="button"
          onClick={() => open("login")}
          className="mt-2 w-full text-center text-[13px] text-muted-foreground hover:text-foreground"
        >
          Já tenho conta. <span className="font-semibold text-primary">Entrar</span>
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] border border-border bg-surface p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] text-muted-foreground">Seu saldo</p>
        <Link
          to="/historico"
          className="text-[12px] font-semibold text-muted-foreground hover:text-primary"
        >
          Extrato
        </Link>
      </div>
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

/* ---------------------------------------------------------------------------
   Sidebar
   --------------------------------------------------------------------------- */

/** Ligas mostradas como atalho, na ordem de interesse do público brasileiro. */
const LEAGUE_SHORTCUTS = ["conmebol.libertadores", "uefa.champions", "eng.1", "esp.1", "nba"];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const search = (location.search ?? {}) as Search;
  const { user } = useAuth();
  const counts = useLobbyCounts();
  const providers = useProviders();
  const fetchEvents = useServerFn(getSportsEvents);
  const sports = useQuery({
    queryKey: ["sports-events"],
    queryFn: () => fetchEvents(),
    staleTime: 60_000,
  });

  // Fecha a gaveta do celular depois de navegar.
  useEffect(() => {
    setOpenMobile(false);
  }, [path, search.cat, search.tipo, search.provedor, search.liga, setOpenMobile]);

  const c = counts.data;
  const events = sports.data ?? [];
  const liveNow = events.filter((e) => e.state === "in").length;
  const leagueCounts = new Map<string, number>();
  for (const e of events)
    if (e.state !== "post") leagueCounts.set(e.league, (leagueCounts.get(e.league) ?? 0) + 1);
  const brazilGames = events.filter(
    (e) => e.state !== "post" && e.league.startsWith("bra."),
  ).length;
  const leagues = LEAGUE_SHORTCUTS.map((id) => LEAGUES.find((l) => l.id === id)!).filter(
    (l) => l && (leagueCounts.get(l.id) ?? 0) > 0,
  );

  const onLive = path === "/ao-vivo";
  const onCassino = path === "/cassino";

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
          <Group title="Cassino" collapsed={collapsed}>
            <NavRow
              to="/"
              label="Início"
              icon={icon(IcFire, path === "/")}
              active={path === "/"}
              collapsed={collapsed}
            />
            <NavRow
              to="/cassino"
              label="Todos os jogos"
              icon={icon(IcGrid, onCassino && !search.cat && !search.provedor)}
              count={c?.all}
              active={onCassino && !search.cat && !search.provedor}
              collapsed={collapsed}
            />
            <NavRow
              to="/slots"
              label="Slots"
              icon={icon(IcSlots, path === "/slots")}
              count={c?.slot}
              active={path === "/slots"}
              collapsed={collapsed}
            />
            <NavRow
              to="/cassino"
              search={{ cat: "crash" }}
              label="Crash"
              icon={icon(IcCrash, onCassino && search.cat === "crash")}
              count={c?.crash}
              active={onCassino && search.cat === "crash"}
              collapsed={collapsed}
            />
            <NavRow
              to="/ao-vivo"
              label="Cassino ao vivo"
              icon={icon(IcLive, onLive && !search.tipo)}
              count={c?.live}
              active={onLive && !search.tipo}
              collapsed={collapsed}
            />
            {!collapsed && (
              <div className="side-subs">
                {GAME_KINDS.map((k) =>
                  (c?.kinds[k.id] ?? 0) > 0 ? (
                    <SubRow
                      key={k.id}
                      to="/ao-vivo"
                      search={{ tipo: k.id }}
                      label={k.short}
                      count={c?.kinds[k.id]}
                      active={onLive && search.tipo === k.id}
                    />
                  ) : null,
                )}
              </div>
            )}
          </Group>

          {!collapsed && (providers.data?.length ?? 0) > 0 && (
            <Group title="Provedores" collapsed={collapsed}>
              {providers.data!.slice(0, 6).map((p) => (
                <Link
                  key={p.name}
                  to="/cassino"
                  search={{ provedor: p.name } as never}
                  aria-current={onCassino && search.provedor === p.name ? "page" : undefined}
                  className={cn(
                    "side-row",
                    onCassino && search.provedor === p.name
                      ? "side-row-active"
                      : "text-foreground/72 hover:bg-surface hover:text-foreground",
                  )}
                >
                  {p.covers[0] ? (
                    <img
                      src={p.covers[0]}
                      alt=""
                      width={20}
                      height={26}
                      loading="lazy"
                      className="side-thumb"
                    />
                  ) : (
                    <span className="side-thumb" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="num side-count">{p.games}</span>
                </Link>
              ))}
              <SubRow
                to="/provedores"
                label={`Todos os ${providers.data!.length} provedores`}
                active={path === "/provedores"}
              />
            </Group>
          )}

          <Group title="Esportes" collapsed={collapsed}>
            <NavRow
              to="/esportes"
              label="Apostas esportivas"
              icon={icon(IcSports, path === "/esportes" && !search.liga && !search.aba)}
              active={path === "/esportes" && !search.liga && !search.aba}
              collapsed={collapsed}
            />
            {!collapsed && (
              <div className="side-subs">
                {liveNow > 0 && (
                  <SubRow
                    to="/esportes"
                    search={{ aba: "ao-vivo" }}
                    label="Ao vivo agora"
                    count={liveNow}
                    active={path === "/esportes" && search.aba === "ao-vivo"}
                    trailing={<span className="live-dot live-dot-sm" aria-hidden />}
                  />
                )}
                {brazilGames > 0 && (
                  <SubRow
                    to="/esportes"
                    search={{ liga: "brasil" }}
                    label="Futebol brasileiro"
                    count={brazilGames}
                    active={path === "/esportes" && search.liga === "brasil"}
                  />
                )}
                {leagues.map((l) => (
                  <SubRow
                    key={l.id}
                    to="/esportes"
                    search={{ liga: l.id }}
                    label={l.label}
                    count={leagueCounts.get(l.id)}
                    active={path === "/esportes" && search.liga === l.id}
                  />
                ))}
              </div>
            )}
          </Group>

          {user && (
            <Group title="Sua conta" collapsed={collapsed}>
              <NavRow
                to="/perfil"
                label="Meus dados"
                icon={
                  <UserRound
                    className={cn(
                      "size-[18px] shrink-0",
                      path === "/perfil" && search.aba !== "limites"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                }
                active={path === "/perfil" && search.aba !== "limites"}
                collapsed={collapsed}
              />
              <NavRow
                to="/historico"
                label="Extrato e apostas"
                icon={
                  <Receipt
                    className={cn(
                      "size-[18px] shrink-0",
                      path === "/historico" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                }
                active={path === "/historico"}
                collapsed={collapsed}
              />
              <NavRow
                to="/saque"
                label="Sacar"
                icon={
                  <ArrowUpFromLine
                    className={cn(
                      "size-[18px] shrink-0",
                      path === "/saque" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                }
                active={path === "/saque"}
                collapsed={collapsed}
              />
              <NavRow
                to="/perfil"
                search={{ aba: "limites" }}
                label="Limites de jogo"
                icon={
                  <Gauge
                    className={cn(
                      "size-[18px] shrink-0",
                      path === "/perfil" && search.aba === "limites"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                }
                active={path === "/perfil" && search.aba === "limites"}
                collapsed={collapsed}
              />
            </Group>
          )}

          <Group title="Mais" collapsed={collapsed}>
            <NavRow
              to="/promocoes"
              label="Promoções"
              icon={icon(IcGift, path === "/promocoes")}
              active={path === "/promocoes"}
              collapsed={collapsed}
            />
          </Group>
        </nav>

        {!collapsed && (
          <div className="mt-auto space-y-0.5 border-t border-border p-3 text-[13px]">
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
              <FileText className="size-4" /> Termos e privacidade
            </Link>
            <div className="flex items-center gap-2.5 px-3 pt-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-destructive font-display text-[12px] font-bold text-destructive">
                18+
              </span>
              <span className="text-[12px] leading-snug text-muted-foreground">
                Proibido para menores. Jogue com limites.
              </span>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
