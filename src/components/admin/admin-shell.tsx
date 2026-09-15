import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle, Settings, Receipt, Home, LogOut, Target, Image as ImageIcon, Menu, X, ShieldCheck, LineChart, Gamepad2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/financeiro", label: "Financeiro", icon: LineChart },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/depositos", label: "Depósitos", icon: ArrowDownCircle },
  { to: "/admin/saques", label: "Saques", icon: ArrowUpCircle },
  { to: "/admin/transacoes", label: "Transações", icon: Receipt },
  { to: "/admin/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/catalogo", label: "Catálogo", icon: Gamepad2 },
  { to: "/admin/pixel", label: "Pixel", icon: Target },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onClick}
              className={`flex items-center gap-3 px-3 h-11 rounded-md text-sm font-semibold transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-white/85 hover:bg-white/10"
              }`}
            >
              <it.icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-white/10 space-y-1">
        <Link to="/" onClick={onClick} className="flex items-center gap-3 px-3 h-11 rounded-md text-sm text-white/85 hover:bg-white/10">
          <Home className="size-4" /> Voltar ao site
        </Link>
        <button onClick={() => { onClick?.(); signOut(); }} className="w-full flex items-center gap-3 px-3 h-11 rounded-md text-sm text-white/85 hover:bg-white/10">
          <LogOut className="size-4" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-brand border-r border-white/10 sticky top-0 h-screen">
        <div className="px-5 h-16 flex items-center border-b border-white/10">
          <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center mr-3"><ShieldCheck className="size-5 text-primary" /></div>
          <div className="min-w-0">
            <span className="block text-white font-black text-xl leading-none">apostaya<span className="text-primary">.bet</span></span>
            <span className="text-[10px] uppercase font-bold text-white/55 tracking-wide">Admin Center</span>
          </div>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] flex flex-col bg-brand border-r border-white/10 h-full animate-in slide-in-from-left duration-200">
            <div className="px-5 h-16 flex items-center justify-between border-b border-white/10">
              <span className="text-white font-black text-xl">apostaya<span className="text-primary">.bet</span></span>
              <button onClick={() => setOpen(false)} className="size-9 rounded-md text-white/80 hover:bg-white/10 flex items-center justify-center">
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onClick={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between gap-3 px-3 md:px-8 bg-card/95 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden size-10 rounded-md border border-border flex items-center justify-center text-foreground hover:bg-muted shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="font-bold text-base md:text-lg truncate">Painel Admin</h1>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground truncate max-w-[140px] md:max-w-[240px]">{user?.email}</div>
        </header>
        <main className="flex-1 p-3 md:p-8 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
