import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  to: string;
  /** Optional right-aligned meta, e.g. "128 jogos". */
  meta?: string;
}

/** Section title with an accent marker and a gradient hairline. */
export function SectionHead({ title, to, meta }: Props) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border pb-2">
      <span className="ping-soft size-2 shrink-0 rounded-full bg-[var(--cat,var(--primary))]" />
      <h2 className="font-display shrink-0 text-[12px] font-extrabold uppercase tracking-[0.16em] md:text-[13px] md:tracking-[0.18em]">
        {title}
      </h2>
      <span className="hidden h-px flex-1 rail-line sm:block" />
      {meta && (
        <span className="hidden text-[11px] font-medium tabular-nums text-muted-foreground sm:block">
          {meta}
        </span>
      )}
      <Link
        to={to}
        className="slick ml-auto flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground hover:border-cat hover:text-cat sm:ml-0 sm:text-[11px]"
      >
        Ver tudo <ArrowRight className="size-3" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
