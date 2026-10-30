import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { Logo } from "./logo";
import { HeaderAccount } from "./header-account";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Início" },
  { to: "/cassino", label: "Cassino" },
  { to: "/slots", label: "Slots" },
  { to: "/ao-vivo", label: "Ao vivo" },
  { to: "/esportes", label: "Esportes" },
] as const;

export function Header() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (q) navigate({ to: "/cassino", search: { q } });
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur-lg">
      <div className="flex h-16 w-full items-center gap-1 px-2 sm:gap-3 md:px-6">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="size-8 shrink-0 text-muted-foreground lg:hidden" aria-label="Abrir menu"><Menu /></Button>
        <Logo />
        <nav aria-label="Navegação principal" className="ml-5 hidden shrink-0 items-center gap-1 2xl:flex">
          {nav.map((item) => <Button key={item.to} variant="ghost" asChild className={cn("h-9 px-3 font-semibold", path === item.to ? "bg-primary/10 text-primary" : "text-muted-foreground")}><Link to={item.to} aria-current={path === item.to ? "page" : undefined}>{item.label}</Link></Button>)}
        </nav>
        <form onSubmit={submitSearch} className="relative ml-3 hidden min-w-0 max-w-56 flex-1 xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar jogo" aria-label="Buscar no catálogo" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </form>
        <HeaderAccount />
      </div>
    </header>
  );
}
