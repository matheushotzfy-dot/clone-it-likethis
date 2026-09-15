import { Link } from "@tanstack/react-router";
import mark from "@/assets/apostaya-mark.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="apostaya.bet"
      className={`flex h-12 shrink-0 items-center overflow-visible md:h-14 ${className}`}
    >
      <span className="flex items-center gap-2 font-black">
        <img src={mark} alt="" width={1024} height={1024} className="size-8 shrink-0 object-contain md:size-9" fetchPriority="high" decoding="async" />
        <span className="whitespace-nowrap text-[17px] leading-none md:text-[22px]">
          <span className="text-foreground">apostaya</span>
          <span className="text-primary">.bet</span>
        </span>
      </span>
    </Link>
  );
}
