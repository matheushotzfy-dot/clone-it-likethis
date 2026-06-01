import { Link } from "@tanstack/react-router";
import shield from "@/assets/santos-shield.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="SANTOSBET"
      className={`flex h-12 md:h-14 items-center overflow-visible shrink-0 ${className}`}
    >
      <span className="flex md:hidden items-center gap-1.5 font-black text-base tracking-tight">
        <img
          src={shield}
          alt="Santos FC"
          width={40}
          height={50}
          className="h-6 w-auto object-contain drop-shadow shrink-0"
          fetchPriority="high"
          decoding="async"
        />
        <span className="leading-none whitespace-nowrap">
          <span className="text-white">SANTOS</span>
          <span className="text-primary">BET</span>
        </span>
      </span>


      <span className="hidden md:flex items-center gap-2.5 h-full min-w-[188px] max-w-[210px] overflow-visible">
        <span className="flex h-full w-10 items-center justify-center overflow-visible shrink-0">
          <img
            src={shield}
            alt="Santos FC"
            width={40}
            height={50}
            className="max-h-[44px] w-auto object-contain drop-shadow"
            fetchPriority="high"
            decoding="async"
          />
        </span>
        <span className="flex items-baseline leading-none whitespace-nowrap font-black text-[25px] tracking-normal">
          <span className="text-white">SANTOS</span>
          <span className="text-primary">BET</span>
        </span>
      </span>
    </Link>
  );
}
