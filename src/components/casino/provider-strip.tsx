import { Link } from "@tanstack/react-router";
import { useProviders } from "@/hooks/use-games";

/** Provedores do catálogo, do que tem mais jogos para o que tem menos. */
export function ProviderStrip() {
  const { data } = useProviders();
  if (!data?.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-[22px] md:text-[26px]">Provedores</h2>
      <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
        {data.slice(0, 24).map((p) => (
          <li key={p.name} className="shrink-0">
            <Link
              to="/cassino"
              search={{ provedor: p.name } as never}
              className="flex h-14 min-w-[136px] flex-col justify-center rounded-[10px] border border-border bg-surface px-4 transition-colors hover:border-primary/60"
            >
              <span className="truncate text-[14.5px] font-semibold">{p.name}</span>
              <span className="num text-[12px] text-muted-foreground">{p.games} jogos</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
