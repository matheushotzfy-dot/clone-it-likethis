import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { CategoryNav } from "@/components/casino/category-nav";
import { PROVIDER_GRID, ProviderCard } from "@/components/casino/provider-strip";
import { useProviders } from "@/hooks/use-games";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/provedores")({
  head: () => ({
    meta: pageMeta(
      "Provedores | apostamaxy",
      "Todos os estúdios de jogos do cassino, com a quantidade de jogos de cada um.",
    ),
  }),
  component: Page,
});

function Page() {
  const { data, isLoading } = useProviders();
  const [term, setTerm] = useState("");
  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (data ?? []).filter((p) => !t || p.name.toLowerCase().includes(t));
  }, [data, term]);
  const totalGames = (data ?? []).reduce((n, p) => n + p.games, 0);

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1600px] space-y-5 px-3 py-4 md:space-y-6 md:px-6 md:py-6">
        <CategoryNav />
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <h1 className="text-[24px] sm:text-[30px] md:text-[36px]">Provedores</h1>
          {data && (
            <p className="num pb-1 text-[14px] text-muted-foreground">
              {data.length} estúdios, {totalGames.toLocaleString("pt-BR")} jogos
            </p>
          )}
        </div>
        <label className="relative block md:w-[340px]">
          <span className="sr-only">Buscar provedor</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar provedor"
            className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </label>
        {isLoading ? (
          <div className={PROVIDER_GRID}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-[132px] rounded-[14px]" />
            ))}
          </div>
        ) : list.length ? (
          <div className={PROVIDER_GRID}>
            {list.map((p) => (
              <ProviderCard key={p.name} p={p} />
            ))}
          </div>
        ) : (
          <p className="rounded-[12px] border border-border bg-surface px-5 py-8 text-center text-muted-foreground">
            Nenhum provedor com esse nome.
          </p>
        )}
      </div>
    </SiteShell>
  );
}
