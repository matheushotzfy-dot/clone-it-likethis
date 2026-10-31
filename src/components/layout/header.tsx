import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { IcSearch } from "@/components/icons/maxy-icons";
import { ModeSwitch } from "./mode-switch";
import { Logo } from "./logo";
import { HeaderAccount } from "./header-account";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function Header() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (q) navigate({ to: "/cassino", search: { q } });
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-sidebar">
      <div className="flex h-14 w-full items-center gap-1 px-2 sm:gap-3 md:px-6">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="size-8 shrink-0 text-muted-foreground" aria-label="Abrir menu"><Menu /></Button>
        <Logo />
        <ModeSwitch className="ml-4 hidden w-60 md:grid" />
        <form onSubmit={submitSearch} className="relative ml-3 hidden min-w-0 max-w-56 flex-1 xl:block">
          <IcSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar jogo" aria-label="Buscar no catálogo" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </form>
        <HeaderAccount />
      </div>
    </header>
  );
}
