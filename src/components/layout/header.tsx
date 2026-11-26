import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search } from "lucide-react";
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
    <header className="app-header sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/85">
      <div className="flex h-[60px] min-w-0 items-center gap-2 px-3 md:gap-3 md:px-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-9 shrink-0 text-muted-foreground hover:text-foreground max-lg:hidden"
          aria-label="Recolher ou expandir menu"
        >
          <Menu className="size-5" />
        </Button>
        <Logo />
        <ModeSwitch className="ml-3 hidden w-[232px] md:grid" />
        <form
          onSubmit={submitSearch}
          role="search"
          className="relative ml-2 hidden min-w-0 max-w-[300px] flex-1 xl:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar jogo ou provedor"
            aria-label="Buscar jogo ou provedor"
            className="h-10 w-full rounded-[10px] border border-border bg-background pl-9 pr-3 text-[14px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </form>
        <HeaderAccount />
      </div>
    </header>
  );
}
