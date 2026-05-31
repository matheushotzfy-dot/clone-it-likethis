import { Link } from "@tanstack/react-router";
import shield from "@/assets/santos-shield.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-black text-xl md:text-2xl tracking-tight ${className}`}>
      <img
        src={shield}
        alt="Santos FC"
        width={32}
        height={32}
        className="size-7 md:size-8 object-contain drop-shadow"
        fetchPriority="high"
        decoding="async"
      />
      <span className="leading-none">
        <span className="text-white">SANTOS</span>
        <span className="text-primary">BET</span>
      </span>
    </Link>
  );
}
