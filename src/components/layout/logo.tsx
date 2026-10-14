import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import mark from "@/assets/apostaya-mark.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="apostamaxy"
      className={cn("flex h-12 shrink-0 items-center overflow-visible md:h-14", className)}
    >
      <span className="flex items-center gap-1.5 font-black">
        <img src={mark} alt="" width={1024} height={1024} className="size-7 shrink-0 object-contain md:size-8" fetchPriority="high" decoding="async" />
        <span className="whitespace-nowrap text-[17px] leading-none md:text-[21px]">
          <span className="text-foreground">aposta</span>
          <span className="text-primary">maxy</span>
        </span>
      </span>
    </Link>
  );
}
