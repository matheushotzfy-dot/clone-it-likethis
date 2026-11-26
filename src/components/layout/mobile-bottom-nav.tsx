import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowDownToLine, Menu, User, UserPlus } from "lucide-react";
import { IcCasino, IcSports } from "@/components/icons/maxy-icons";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const CASINO = ["/", "/cassino", "/slots", "/ao-vivo", "/torneios", "/promocoes"];
const ACCOUNT = ["/perfil", "/historico", "/saque", "/deposito"];

function Cell({ active, icon, label }: { active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-7 w-12 place-items-center rounded-full transition-colors",
          active && "bg-surface-2 text-primary",
        )}
      >
        {icon}
      </span>
      {label}
    </span>
  );
}

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { open } = useAuthDialog();
  const { user } = useAuth();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-[64px] grid-cols-5">
        <li>
          <button
            type="button"
            onClick={toggleSidebar}
            className="size-full"
            aria-label="Abrir menu"
          >
            <Cell active={false} icon={<Menu className="size-[21px]" />} label="Menu" />
          </button>
        </li>
        <li>
          <Link to="/" className="block size-full">
            <Cell
              active={CASINO.includes(path)}
              icon={<IcCasino className="size-[21px]" />}
              label="Cassino"
            />
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => open(user ? "deposit" : "register")}
            className="flex size-full flex-col items-center justify-center gap-1"
            aria-label={user ? "Depositar" : "Criar conta"}
          >
            {/* Verde Pix só quando o botão é de depósito; para criar conta, azul de ação. */}
            <span
              className={
                user
                  ? "grid size-10 place-items-center rounded-[12px] bg-pix text-pix-foreground"
                  : "grid size-10 place-items-center rounded-[12px] bg-primary text-primary-foreground"
              }
            >
              {user ? <ArrowDownToLine className="size-5" /> : <UserPlus className="size-5" />}
            </span>
            <span className="text-[11px] font-semibold text-foreground/80">
              {user ? "Depositar" : "Criar conta"}
            </span>
          </button>
        </li>
        <li>
          <Link to="/esportes" className="block size-full">
            <Cell
              active={path.startsWith("/esportes")}
              icon={<IcSports className="size-[21px]" />}
              label="Esportes"
            />
          </Link>
        </li>
        <li>
          {user ? (
            <Link to="/perfil" className="block size-full">
              <Cell
                active={ACCOUNT.includes(path)}
                icon={<User className="size-[21px]" />}
                label="Conta"
              />
            </Link>
          ) : (
            <button type="button" onClick={() => open("login")} className="size-full">
              <Cell active={false} icon={<User className="size-[21px]" />} label="Entrar" />
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}
