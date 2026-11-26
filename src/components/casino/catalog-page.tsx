import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { GameGrid } from "./game-section";
import { CategoryNav, type CategoryKey } from "./category-nav";
import { useLobbyPages, usePlay, useProviders, type LobbyCategory } from "@/hooks/use-games";
import { Button } from "@/components/ui/button";

export interface CatalogSearch {
  q?: string;
  cat?: string;
  provedor?: string;
}

const CATS: { id: LobbyCategory | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "slot", label: "Slots" },
  { id: "crash", label: "Crash" },
  { id: "live", label: "Ao vivo" },
  { id: "table", label: "Mesas" },
];

export function parseCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined;
  return { q: str(search.q), cat: str(search.cat), provedor: str(search.provedor) };
}

function toCategory(
  cat: string | undefined,
  fallback: LobbyCategory | "all",
): LobbyCategory | "all" {
  return CATS.some((c) => c.id === cat) ? (cat as LobbyCategory | "all") : fallback;
}

/**
 * Catálogo completo com busca, categoria e provedor. A URL guarda os filtros
 * para que links da sidebar e da busca do topo caiam no lugar certo.
 */
export function CatalogPage({
  title,
  nav,
  fixedCategory,
  search,
  onSearch,
}: {
  title: string;
  nav: CategoryKey;
  /** Slots e Ao vivo travam a categoria; Cassino deixa escolher. */
  fixedCategory?: LobbyCategory;
  search: CatalogSearch;
  onSearch: (next: CatalogSearch) => void;
}) {
  const category = fixedCategory ?? toCategory(search.cat, "all");
  const [term, setTerm] = useState(search.q ?? "");
  useEffect(() => {
    setTerm(search.q ?? "");
  }, [search.q]);

  // Busca enquanto digita, com uma pequena espera.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== term.trim()) onSearch({ ...search, q: term.trim() || undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const filter = useMemo(
    () => ({ category, provider: search.provedor, q: search.q }),
    [category, search.provedor, search.q],
  );
  const pages = useLobbyPages(filter);
  const providers = useProviders();
  const play = usePlay();
  const games = pages.data?.pages.flatMap((p) => p.games) ?? [];
  const total = pages.data?.pages[0]?.total ?? 0;
  const showcase = pages.data?.pages[0]?.showcase;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-3 py-4 md:space-y-6 md:px-6 md:py-6">
      <CategoryNav active={nav} />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1 className="text-[30px] md:text-[36px]">{title}</h1>
        <p className="num pb-1 text-[14px] text-muted-foreground">
          {pages.isLoading
            ? "Carregando…"
            : `${total.toLocaleString("pt-BR")} ${total === 1 ? "jogo" : "jogos"}`}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block md:w-[340px]">
          <span className="sr-only">Buscar jogo</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar pelo nome do jogo"
            className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-10 text-[15px] outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        {!fixedCategory && (
          <div
            className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0"
            role="tablist"
            aria-label="Tipo de jogo"
          >
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                data-active={category === c.id}
                onClick={() => onSearch({ ...search, cat: c.id === "all" ? undefined : c.id })}
                className="chip shrink-0"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <label className="md:ml-auto">
          <span className="sr-only">Provedor</span>
          <select
            value={search.provedor ?? ""}
            onChange={(e) => onSearch({ ...search, provedor: e.target.value || undefined })}
            className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-[15px] outline-none focus:border-primary md:w-[220px]"
          >
            <option value="">Todos os provedores</option>
            {(providers.data ?? []).map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.games})
              </option>
            ))}
          </select>
        </label>
      </div>

      {showcase && (
        <p className="rounded-[10px] border border-border bg-surface px-4 py-3 text-[14px] text-muted-foreground">
          Esta é a vitrine do cassino. Os jogos abrem assim que o catálogo do provedor for ativado.
        </p>
      )}

      <GameGrid
        games={games}
        loading={pages.isLoading}
        onPlay={play}
        empty={
          <div className="rounded-[12px] border border-border bg-surface px-6 py-12 text-center">
            <p className="font-display text-[22px] font-bold">Nenhum jogo encontrado</p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Tente outro nome ou limpe os filtros.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setTerm("");
                onSearch({});
              }}
            >
              Limpar filtros
            </Button>
          </div>
        }
      />

      {pages.hasNextPage && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="num text-[13px] text-muted-foreground">
            Mostrando {games.length} de {total.toLocaleString("pt-BR")}
          </p>
          <Button
            variant="secondary"
            className="h-11 min-w-[200px] rounded-[10px]"
            disabled={pages.isFetchingNextPage}
            onClick={() => pages.fetchNextPage()}
          >
            {pages.isFetchingNextPage ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Carregar mais jogos"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
