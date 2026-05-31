import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle, Settings, Receipt, Home, LogOut, Target, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/depositos", label: "Depósitos", icon: ArrowDownCircle },
  { to: "/admin/saques", label: "Saques", icon: ArrowUpCircle },
  { to: "/admin/kyc", label: "Verificações", icon: ShieldCheck },
  { to: "/admin/transacoes", label: "Transações", icon: Receipt },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/pixel", label: "Pixel", icon: Target },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex w-60 flex-col bg-brand border-r border-white/10 sticky top-0 h-screen">
        <div className="px-5 h-16 flex items-center border-b border-white/10">
          <span className="text-white font-black text-xl">SANTOS<span className="text-primary">BET</span></span>
          <span className="ml-2 text-[10px] uppercase font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">ADMIN</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm font-semibold transition-colors ${
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
          <Link to="/" className="flex items-center gap-3 px-3 h-10 rounded-md text-sm text-white/85 hover:bg-white/10">
            <Home className="size-4" /> Voltar ao site
          </Link>
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm text-white/85 hover:bg-white/10">
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card">
          <h1 className="font-bold text-lg">Painel Administrativo</h1>
          <div className="text-sm text-muted-foreground truncate max-w-[200px]">{user?.email}</div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
