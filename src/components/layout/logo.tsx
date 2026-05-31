import { Link } from "@tanstack/react-router";
import shield from "@/assets/santos-shield.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 md:gap-3 font-black text-xl md:text-2xl tracking-tight shrink-0 ${className}`}>
      <img
        src={shield}
        alt="Santos FC"
        width={40}
        height={50}
        className="h-7 w-auto md:h-10 object-contain drop-shadow shrink-0"
        fetchPriority="high"
        decoding="async"
      />
      <span className="leading-none whitespace-nowrap">
        <span className="text-white">SANTOS</span>
        <span className="text-primary">BET</span>
      </span>
    </Link>
  );
}
