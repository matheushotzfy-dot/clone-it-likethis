import { Button } from "@/components/ui/button";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { PFGameCard } from "@/components/casino/pf-game-card";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

/** Grid compacto: mais jogos por tela, artes menores e nítidas. */
export const CATALOG_GRID =
  "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9";

export function CatalogHeader({
  title, subtitle, q, onQ, placeholder = "Buscar jogo ou provedor…",
}: {
  title: string;
  subtitle: string;
  q: string;
  onQ: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-4 md:flex md:justify-between">
      <div className="min-w-0">
        <h1 className="title-cond truncate text-3xl md:text-4xl">{title}</h1>
        <p className="mt-1 text-[12px] text-muted-foreground md:text-[13px]">{subtitle}</p>
      </div>
      <div className="relative w-full md:w-80">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-surface/50 pl-10 pr-3 text-[13px] font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

export function ProviderFilter({
  providers, value, onChange,
}: {
  providers: { id: number; name: string }[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const chip = (active: boolean) =>
    cn(
      "chip-flat h-9 shrink-0 rounded-lg border border-border px-3.5 text-[11.5px] font-semibold",
      active ? "text-primary" : "text-foreground/70",
    );
  return (
    <div className="edge-fade no-scrollbar snap-row flex w-full max-w-full gap-1.5 overflow-x-auto pb-1 pr-4 md:gap-2">
      <Button variant="ghost" onClick={() => onChange(null)} data-active={value === null} className={chip(value === null)}>Todos</Button>
      {providers.map((p) => (
        <Button variant="ghost" key={p.id} data-active={value === p.id} onClick={() => onChange(p.id)} className={chip(value === p.id)}>
          {p.name}
        </Button>
      ))}
    </div>
  );
}

export function GameGrid({
  games, loading, launchingCode, onPlay, emptyLabel = "Nenhum jogo encontrado.",
}: {
  games: PFGameLite[];
  loading?: boolean;
  launchingCode: string | null;
  onPlay: (g: PFGameLite) => void;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div className={CATALOG_GRID}>
        {Array.from({ length: 27 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }
  if (games.length === 0) {
    return <p className="panel p-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className={CATALOG_GRID}>
      {games.map((g, i) => (
        <PFGameCard
          key={`${g.provider.name}-${g.game_code}-${i}`}
          game={g}
          priority={i < 12}
          loading={launchingCode === g.game_code}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}

export function LoadMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div className="flex justify-center pt-2">
      <Button variant="ghost"
        onClick={onClick}
        className="slick min-w-[220px] rounded-md border border-border px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-foreground/80 hover:border-primary hover:text-primary"
      >
        <ChevronDown className="size-4" /> Carregar mais ({remaining})
      </Button>
    </div>
  );
}

export function InlineSpinner() {
  return (
    <div className="flex justify-center py-2">
      <Loader2 className="size-4 animate-spin text-primary" />
    </div>
  );
}
