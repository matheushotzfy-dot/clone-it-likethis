import { Menu } from "lucide-react";
import { ModeSwitch } from "./mode-switch";
import { Logo } from "./logo";
import { HeaderAccount } from "./header-account";
import { HeaderSearch } from "./header-search";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function Header() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="app-header sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/85">
      <div className="flex h-14 min-w-0 items-center gap-2 px-3 sm:h-[60px] md:gap-3 md:px-5">
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
        <HeaderSearch className="ml-2 hidden max-w-[320px] flex-1 xl:block" />
        <HeaderAccount />
      </div>
    </header>
  );
}
