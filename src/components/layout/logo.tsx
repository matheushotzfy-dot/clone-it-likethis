import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="APOSTAYA.BET"
      className={`flex h-12 md:h-14 items-center overflow-visible shrink-0 ${className}`}
    >
      <span className="flex md:hidden items-center gap-1.5 font-black text-base tracking-tight">
        <span className="leading-none whitespace-nowrap">
          <span className="text-white">APOSTAYA</span>
          <span className="text-primary">.BET</span>
        </span>
      </span>

      <span className="hidden md:flex items-center gap-2.5 h-full overflow-visible">
        <span className="flex items-baseline leading-none whitespace-nowrap font-black text-[25px] tracking-normal">
          <span className="text-white">APOSTAYA</span>
          <span className="text-primary">.BET</span>
        </span>
      </span>
    </Link>
  );
}
