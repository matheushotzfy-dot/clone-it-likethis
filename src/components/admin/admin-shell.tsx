import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Gamepad2,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Target,
  Trophy,
  Users,
  X,
  Library,
  ExternalLink,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getOverview } from "@/lib/admin.functions";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

type Item = {
  to: string;
  label: string;
  icon: typeof Users;
  exact?: boolean;
  badge?: "withdrawals" | "kyc" | "deposits";
};

const groups: { title: string; items: Item[] }[] = [
  {
    title: "",
    items: [{ to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Fila de trabalho",
    items: [
      { to: "/admin/saques", label: "Saques", icon: ArrowUpFromLine, badge: "withdrawals" },
      { to: "/admin/kyc", label: "Documentos", icon: BadgeCheck, badge: "kyc" },
      { to: "/admin/depositos", label: "Depósitos", icon: ArrowDownToLine },
    ],
  },
  {
    title: "Jogadores e dinheiro",
    items: [
      { to: "/admin/usuarios", label: "Jogadores", icon: Users },
      { to: "/admin/transacoes", label: "Movimentações", icon: Receipt },
      { to: "/admin/financeiro", label: "Financeiro", icon: LineChart },
    ],
  },
  {
    title: "Jogo",
    items: [
      { to: "/admin/cassino", label: "Cassino", icon: Gamepad2 },
      { to: "/admin/esportes", label: "Esportes", icon: Trophy },
      { to: "/admin/catalogo", label: "Catálogo de jogos", icon: Library },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { to: "/admin/banners", label: "Banners", icon: ImageIcon },
      { to: "/admin/pixel", label: "Públicos", icon: Target },
      { to: "/admin/auditoria", label: "Auditoria", icon: History },
      { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const fetchOverview = useServerFn(getOverview);
  const overview = useQuery({
    queryKey: ["admin-overview", 14],
    queryFn: () => fetchOverview({ data: { days: 14 } }),
    refetchInterval: 30_000,
  });
  const counts = {
    withdrawals: overview.data?.queues.withdrawals ?? 0,
    kyc: overview.data?.queues.kyc ?? 0,
    deposits: overview.data?.queues.deposits ?? 0,
  };
  const flags = overview.data?.flags;

  const nav = (onClick?: () => void) => (
    <nav className="thin-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && (
            <p className="mb-1 px-3 text-[12px] font-semibold text-muted-foreground/80">
              {g.title}
            </p>
          )}
          <div className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.exact
                ? path === it.to
                : path === it.to || path.startsWith(`${it.to}/`);
              const badge = it.badge ? counts[it.badge] : 0;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={onClick}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-[8px] px-3 text-[14px] font-medium transition-colors",
                    active
                      ? "bg-surface-2 text-foreground"
                      : "text-foreground/70 hover:bg-surface hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary" />
                  )}
                  <it.icon
                    className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground")}
                  />
                  <span className="flex-1 truncate">{it.label}</span>
                  {badge > 0 && (
                    <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11.5px] font-bold text-background">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footer = (onClick?: () => void) => (
    <div className="space-y-0.5 border-t border-border p-3 text-[14px]">
      <Link
        to="/"
        onClick={onClick}
        className="flex h-9 items-center gap-3 rounded-[8px] px-3 text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <ExternalLink className="size-4" /> Ver o site
      </Link>
      <button
        type="button"
        onClick={() => {
          onClick?.();
          signOut();
        }}
        className="flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <LogOut className="size-4" /> Sair
      </button>
      <p className="truncate px-3 pt-1 text-[12px] text-muted-foreground/80">{user?.email}</p>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-[60px] items-center gap-2 border-b border-border px-5">
          <Logo />
          <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
            admin
          </span>
        </div>
        {nav()}
        {footer()}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-overlay/70"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-sidebar">
            <div className="flex h-[60px] items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-surface"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav(() => setOpen(false))}
            {footer(() => setOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {flags && (!flags.realMoney || flags.maintenance) && (
          <div className="homolog-bar px-4 py-1.5 text-center text-[13px] font-semibold">
            {flags.maintenance ? "Site em manutenção." : "Homologação: dinheiro real desligado."}{" "}
            <Link to="/admin/configuracoes" className="underline">
              Configurações
            </Link>
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-[56px] items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-surface"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
          {counts.withdrawals > 0 && (
            <Link
              to="/admin/saques"
              className="num ml-auto rounded-full bg-gold px-2.5 py-1 text-[12px] font-bold text-background"
            >
              {counts.withdrawals} saques
            </Link>
          )}
        </header>
        <header className="sticky top-0 z-30 hidden h-[60px] items-center gap-4 border-b border-border bg-background/90 px-8 backdrop-blur lg:flex">
          <PlayerSearch />
          <div className="ml-auto flex items-center gap-5 text-[13px]">
            {overview.data && (
              <>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="live-dot live-dot-sm" aria-hidden />
                  <span className="num font-semibold text-foreground">
                    {overview.data.playingNow}
                  </span>{" "}
                  jogando agora
                </span>
                <span className="text-muted-foreground">
                  Saldo dos jogadores{" "}
                  <span className="num font-semibold text-foreground">
                    {formatBRL(overview.data.liability)}
                  </span>
                </span>
              </>
            )}
            <Link
              to="/"
              className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-4" /> Ver o site
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-5 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

/** Busca rápida: Enter abre a lista de jogadores já filtrada. */
function PlayerSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = term.trim();
        if (!q) return;
        navigate({ to: "/admin/usuarios", search: { q } });
        setTerm("");
      }}
      className="relative w-[360px]"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar jogador por nome, CPF, e-mail ou celular"
        aria-label="Buscar jogador"
        className="h-10 w-full rounded-[10px] border border-border bg-surface pl-9 pr-3 text-[14px] outline-none placeholder:text-muted-foreground focus:border-primary"
      />
    </form>
  );
}
