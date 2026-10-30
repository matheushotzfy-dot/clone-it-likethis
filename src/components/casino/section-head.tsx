import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  to: string;
  /** Optional right-aligned meta, e.g. "128 jogos". */
  meta?: string;
}

/**
 * Dense section header: accent bar + title + inline count badge on a single
 * 26px line, closing with a hairline rule that ties into the grid below.
 */
export function SectionHead({ title, to, meta }: Props) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <h2 className="title-cond min-w-0 text-xl md:text-2xl">
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 rounded-[3px] bg-surface px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {meta}
        </span>
      )}
      <span className="flex-1" />
      <Link
        to={to}
        className="ml-auto flex shrink-0 items-center gap-1 rounded-[4px] border border-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:ml-0"
      >
        Ver tudo <ArrowRight className="size-3" strokeWidth={2.6} />
      </Link>
    </div>
  );
}
