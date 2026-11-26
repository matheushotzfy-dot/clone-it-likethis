import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto max-w-[1100px] px-3 py-5 md:px-6 md:py-8">
        <nav
          aria-label="Seções da conta"
          className="no-scrollbar -mx-3 mb-6 flex gap-1 overflow-x-auto border-b border-border px-3 md:mx-0 md:px-0"
        >
          {TABS.map((t) => {
            const active = path === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative shrink-0 px-3 pb-3 pt-1 text-[15px] font-semibold transition-colors",
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
            <h1 className="mb-5 text-[32px] md:text-[38px]">{title}</h1>
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
      className="no-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0"
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
    <section className={cn("rounded-[14px] border border-border bg-surface p-4 md:p-6", className)}>
      <h2 className="text-[22px]">{title}</h2>
      {description && <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
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
