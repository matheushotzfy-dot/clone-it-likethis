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
    <div className="flex items-center gap-2 border-b border-border pb-1.5">
      <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-[var(--cat,var(--primary))]" />
      <h2 className="font-display shrink-0 text-[12px] font-extrabold uppercase tracking-[0.14em] md:text-[12.5px]">
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 rounded-[5px] border border-border px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground">
          {meta}
        </span>
      )}
      <span className="hidden h-px flex-1 rail-line sm:block" />
      <Link
        to={to}
        className="slick ml-auto flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground hover:text-cat sm:ml-0"
      >
        Ver tudo <ArrowRight className="size-3" strokeWidth={2.6} />
      </Link>
    </div>
  );
}
