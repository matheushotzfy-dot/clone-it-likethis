import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center font-extrabold text-2xl tracking-tight ${className}`}>
      <span className="text-white">pi</span>
      <span className="text-primary">x</span>
      <span className="text-white">bet</span>
    </Link>
  );
}
