import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  to: string;
  /** Optional right-aligned meta, e.g. "128 jogos". */
  meta?: string;
}

/** Plain text section title with a hairline rule — no icon chips, no colour blocks. */
export function SectionHead({ title, to, meta }: Props) {
  return (
    <div className="flex items-end gap-3 border-b border-border pb-2">
      <h2 className="font-display shrink-0 text-[13px] font-bold uppercase tracking-[0.18em]">
        {title}
      </h2>
      {meta && (
        <span className="hidden text-[11px] font-medium tabular-nums text-muted-foreground sm:block">
          {meta}
        </span>
      )}
      <Link
        to={to}
        className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-gold"
      >
        Ver tudo <ArrowRight className="size-3" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
