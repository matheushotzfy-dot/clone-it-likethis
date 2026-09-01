import { Search, Loader2 } from "lucide-react";
import { PFGameCard } from "@/components/casino/pf-game-card";
import type { PFGameLite } from "@/hooks/use-pf-launch";
import { cn } from "@/lib/utils";

export const CATALOG_GRID =
  "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6";

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
        <h1 className="truncate text-xl font-bold md:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="relative w-full md:w-80">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-md border border-border bg-surface/60 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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
      "slick h-9 shrink-0 rounded-md border px-4 text-[13px] font-semibold",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-surface/60 text-foreground/70 hover:border-primary/60 hover:text-foreground",
    );
  return (
    <div className="no-scrollbar snap-row -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
      <button onClick={() => onChange(null)} className={chip(value === null)}>Todos</button>
      {providers.map((p) => (
        <button key={p.id} onClick={() => onChange(p.id)} className={chip(value === p.id)}>
          {p.name}
        </button>
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
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-[10px]" />
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
      <button
        onClick={onClick}
        className="slick min-w-[220px] rounded-md border border-border px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-foreground/80 hover:border-primary hover:text-primary"
      >
        Carregar mais ({remaining})
      </button>
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
