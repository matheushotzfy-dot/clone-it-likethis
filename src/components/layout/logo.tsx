import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import mark from "@/assets/apostaya-mark.png";

export function Logo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label="apostamaxy, ir para o início"
      className={cn("flex shrink-0 items-center gap-1.5", className)}
    >
      <img
        src={mark}
        alt=""
        width={64}
        height={64}
        className="size-7 shrink-0 object-contain md:size-8"
        fetchPriority="high"
        decoding="async"
      />
      {!compact && (
        <span className="whitespace-nowrap text-[19px] font-extrabold leading-none tracking-[-0.02em] md:text-[21px]">
          aposta<span className="text-primary">maxy</span>
        </span>
      )}
    </Link>
  );
}
