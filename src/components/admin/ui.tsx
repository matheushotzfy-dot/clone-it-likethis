import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { maskCPF } from "@/lib/validations";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[30px] md:text-[34px]">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("rounded-[12px] border border-border bg-surface", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          {title && <h2 className="text-[19px]">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={cn(!flush && "p-4 md:p-5")}>{children}</div>
    </section>
  );
}

/** Número de destaque com rótulo embaixo. tone colore só o número quando ele tem um sentido (entrada, saída, alerta). */
export function Stat({
  label,
  value,
  sub,
  tone,
  to,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "in" | "out" | "warn" | "gold";
  to?: string;
}) {
  const body = (
    <>
      <p
        className={cn(
          "num font-display text-[28px] font-bold leading-none md:text-[30px]",
          tone === "in" && "text-pix",
          tone === "out" && "text-[#e8763a]",
          tone === "warn" && "text-gold",
          tone === "gold" && "text-gold",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[13px] font-medium text-foreground/85">{label}</p>
      {sub && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{sub}</p>}
    </>
  );
  const cls = "block rounded-[12px] border border-border bg-surface p-4";
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:border-primary/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Money({
  value,
  signed,
  className,
}: {
  value: number;
  signed?: boolean;
  className?: string;
}) {
  const neg = value < 0;
  return (
    <span
      className={cn(
        "num whitespace-nowrap",
        signed && (neg ? "text-foreground/80" : value > 0 ? "text-live" : ""),
        className,
      )}
    >
      {signed ? (neg ? "−" : value > 0 ? "+" : "") : ""}
      {formatBRL(signed ? Math.abs(value) : value)}
    </span>
  );
}

export function PlayerLink({
  user,
  id,
}: {
  user: { username: string | null; full_name?: string | null; cpf?: string | null } | null;
  id: string;
}) {
  return (
    <Link to="/admin/usuarios/$id" params={{ id }} className="group block min-w-0">
      <span className="block truncate text-[14px] font-semibold group-hover:text-primary">
        {user?.full_name || user?.username || id.slice(0, 8)}
      </span>
      <span className="num block truncate text-[12px] text-muted-foreground">
        {user?.cpf ? maskCPF(user.cpf) : (user?.username ?? "")}
      </span>
    </Link>
  );
}

const PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-gold/15 text-gold" },
  approved: { label: "Aprovado", cls: "bg-live/15 text-live" },
  completed: { label: "Concluído", cls: "bg-live/15 text-live" },
  rejected: { label: "Recusado", cls: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelado", cls: "bg-surface-2 text-muted-foreground" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive" },
  open: { label: "Aberta", cls: "bg-primary/15 text-primary" },
  won: { label: "Ganhou", cls: "bg-gold/15 text-gold" },
  lost: { label: "Perdeu", cls: "bg-surface-2 text-muted-foreground" },
  void: { label: "Anulada", cls: "bg-surface-2 text-muted-foreground" },
  settled: { label: "Liquidada", cls: "bg-surface-2 text-muted-foreground" },
  refunded: { label: "Estornada", cls: "bg-gold/15 text-gold" },
  frozen: { label: "Suspenso", cls: "bg-destructive/15 text-destructive" },
  active: { label: "Ativo", cls: "bg-live/15 text-live" },
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const p = PILL[status] ?? { label: status, cls: "bg-surface-2 text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold",
        p.cls,
      )}
    >
      {label ?? p.label}
    </span>
  );
}

export function Table({
  head,
  children,
  empty,
  loading,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="thin-scrollbar overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-border text-left text-[12.5px] font-semibold text-muted-foreground">
            {head.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap px-4 py-2.5 font-semibold first:pl-5 last:pr-5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!loading && empty}
    </div>
  );
}

export function Td({
  children,
  className,
  right,
}: {
  children: ReactNode;
  className?: string;
  right?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle first:pl-5 last:pr-5",
        right && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[14px] text-muted-foreground">{children}</p>;
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
      <span className="num">
        {page * pageSize + 1} a {Math.min(total, (page + 1) * pageSize)} de{" "}
        {total.toLocaleString("pt-BR")}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="shadow-none"
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page + 1 >= pages}
          onClick={() => onPage(page + 1)}
          className="shadow-none"
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

export function LoadMore({
  show,
  loading,
  onClick,
}: {
  show: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  if (!show) return null;
  return (
    <div className="border-t border-border p-3 text-center">
      <Button variant="ghost" disabled={loading} onClick={onClick} className="h-9">
        {loading ? <Loader2 className="animate-spin" /> : "Carregar mais"}
      </Button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-1.5 overflow-x-auto">
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

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-[12px] border border-destructive/40 bg-destructive/10 p-4 text-[14px]">
      <p className="font-semibold">Não foi possível carregar.</p>
      <p className="mt-1 text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3 shadow-none" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
