import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-2xl font-black tracking-tight text-foreground">PIX</span>
      <span className="inline-block size-3 bg-primary rounded-sm" />
      <span className="text-2xl font-black tracking-tight text-foreground">BET</span>
    </Link>
  );
}
