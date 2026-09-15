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
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-display text-[12px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          Provedores oficiais
        </h2>
        <Link to="/cassino" className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-gold">
          Ver todos
        </Link>
      </div>
      <div className="no-scrollbar snap-row flex w-full max-w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {list.map((name) => (
          <Link
            key={name}
            to="/cassino"
            className="tile flex h-11 shrink-0 items-center rounded-[8px] border border-border bg-surface/50 px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-foreground/70 hover:text-gold"
          >
            {name}
          </Link>
        ))}
      </div>
    </section>
  );
}
