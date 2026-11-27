import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useProfile, useWallet } from "@/hooks/use-account";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cartão do titular no topo da área da conta: quem é, desde quando, saldo e atalhos. */
function AccountHeader() {
  const profile = useProfile();
  const wallet = useWallet();
  const { open } = useAuthDialog();
  const p = profile.data;
  const name = p?.full_name || p?.username || "";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "·";
  const since = p?.created_at
    ? new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(p.created_at))
    : null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3 rounded-[14px] border border-border bg-[linear-gradient(135deg,var(--surface-2),var(--surface)_60%)] p-3.5 sm:mb-5 sm:gap-4 sm:rounded-[16px] sm:p-4 md:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-[17px] font-bold text-primary sm:size-12 sm:text-[20px] md:size-14 md:text-[22px]">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[15.5px] font-semibold sm:text-[17px]">
          {name ? `Olá, ${name.split(" ")[0]}` : "Sua conta"}
          {p?.kyc_verified && (
            <BadgeCheck className="size-4 shrink-0 text-live" aria-label="Documentos verificados" />
          )}
        </p>
        {since && (
          <p className="text-[12.5px] text-muted-foreground sm:text-[13px]">
            Cliente desde {since}
          </p>
        )}
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
        <div className="mr-auto min-w-0 sm:mr-2 sm:text-right">
          <p className="text-[11.5px] text-muted-foreground sm:text-[12px]">Saldo</p>
          <p className="num truncate font-display text-[20px] font-bold leading-none sm:text-[24px]">
            {wallet.data ? formatBRL(wallet.data.balance) : "–"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => open("deposit")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-pix px-3 text-[13.5px] font-bold text-pix-foreground hover:brightness-110 sm:h-10 sm:px-3.5 sm:text-[14px]"
        >
          <ArrowDownToLine className="size-4" /> Depositar
        </button>
        <Link
          to="/saque"
          className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-border px-3 text-[13.5px] font-semibold hover:border-foreground/30 sm:h-10 sm:px-3.5 sm:text-[14px]"
        >
          <ArrowUpFromLine className="size-4" /> Sacar
        </Link>
      </div>
    </div>
  );
}

const TABS = [
  { to: "/perfil", label: "Minha conta" },
  { to: "/historico", label: "Extrato e apostas" },
  { to: "/saque", label: "Sacar" },
] as const;

/** Moldura das páginas da conta, com as três seções lado a lado. */
export function AccountLayout({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <SiteShell>
      <div className="mx-auto max-w-[1100px] px-3 py-3 sm:py-5 md:px-6 md:py-8">
        <AccountHeader />
        <nav
          aria-label="Seções da conta"
          className="no-scrollbar -mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-border px-3 sm:mb-6 md:mx-0 md:px-0"
        >
          {TABS.map((t) => {
            const active = path === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative shrink-0 px-3 pb-2.5 pt-1 text-[14px] font-semibold transition-colors sm:pb-3 sm:text-[15px]",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className={cn(aside && "grid gap-6 lg:grid-cols-[1fr_320px]")}>
          <div className="min-w-0">
            <h1 className="mb-5 text-[32px] max-sm:sr-only md:text-[38px]">{title}</h1>
            {children}
          </div>
          {aside && <aside className="space-y-4">{aside}</aside>}
        </div>
      </div>
    </SiteShell>
  );
}

/** Abas internas de uma página da conta (guardadas na URL em ?aba=). */
export function SubTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="no-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 sm:mb-5 md:mx-0 md:px-0"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          data-active={value === o.id}
          onClick={() => onChange(o.id)}
          className="chip shrink-0"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "account-section rounded-[14px] border border-border bg-surface p-4 md:p-6",
        className,
      )}
    >
      <h2 className="text-[19px] sm:text-[22px]">{title}</h2>
      {description && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
          {description}
        </p>
      )}
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-[22px] font-bold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
