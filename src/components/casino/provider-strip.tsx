import { Link } from "@tanstack/react-router";
import { usePFProviders } from "@/hooks/use-pf-launch";

const fallback = [
  "PG Soft", "Pragmatic Play", "Spribe", "TaDa Gaming", "Smartsoft",
  "BGaming", "Hacksaw", "Spinomenal", "Evoplay", "Popok",
  "Nolimit City", "Galaxsys", "Platipus", "Irondog",
];

export function ProviderStrip() {
  const providersQ = usePFProviders();
  const names = (providersQ.data ?? []).map((p) => p.name);
  const list = names.length > 0 ? names.slice(0, 24) : fallback;

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Provedores
        </h2>
        <Link to="/cassino" className="text-[11px] font-bold text-primary hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="no-scrollbar snap-row -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
        {list.map((name) => (
          <Link
            key={name}
            to="/cassino"
            className="slick flex h-11 shrink-0 items-center rounded-md border border-border bg-surface/60 px-5 text-[13px] font-bold uppercase tracking-wide text-foreground/70 hover:border-primary/60 hover:text-primary"
          >
            {name}
          </Link>
        ))}
      </div>
    </section>
  );
}
