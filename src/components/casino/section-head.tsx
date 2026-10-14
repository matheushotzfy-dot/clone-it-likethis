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
      <span className="h-4 w-1 shrink-0 rounded-full bg-primary" />
      <h2 className="font-display min-w-0 text-base font-bold md:text-lg">
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground">
          {meta}
        </span>
      )}
      <span className="flex-1" />
      <Link
        to={to}
        className="slick ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary sm:ml-0"
      >
        Ver tudo <ArrowRight className="size-3" strokeWidth={2.6} />
      </Link>
    </div>
  );
}
