import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { GameGrid } from "./game-section";
import { CategoryNav, type CategoryKey } from "./category-nav";
import { useLobbyPages, usePlay, useProviders, type LobbyCategory } from "@/hooks/use-games";
import { GAME_KINDS, kindDef, type GameKind } from "@/lib/game-kinds";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CatalogSearch {
  q?: string;
  cat?: string;
  provedor?: string;
  tipo?: string;
  ordem?: string;
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
  return {
    q: str(search.q),
    cat: str(search.cat),
    provedor: str(search.provedor),
    tipo: kindDef(str(search.tipo)) ? str(search.tipo) : undefined,
    ordem: search.ordem === "az" ? "az" : undefined,
  };
}

function toCategory(
  cat: string | undefined,
  fallback: LobbyCategory | "all",
): LobbyCategory | "all" {
  return CATS.some((c) => c.id === cat) ? (cat as LobbyCategory | "all") : fallback;
}

/**
 * Catálogo completo com busca, categoria, tipo, provedor e ordem. A URL guarda
 * os filtros para que links da sidebar, da home e da busca caiam no lugar certo.
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
  const kind = (category === "live" ? search.tipo : undefined) as GameKind | undefined;
  const sort = search.ordem === "az" ? "az" : "popular";
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
    () => ({ category, kind, provider: search.provedor, q: search.q, sort }) as const,
    [category, kind, search.provedor, search.q, sort],
  );
  const pages = useLobbyPages(filter);
  const providers = useProviders(category === "all" || category === "other" ? undefined : category);
  const play = usePlay();
  const games = pages.data?.pages.flatMap((p) => p.games) ?? [];
  const total = pages.data?.pages[0]?.total ?? 0;
  const showcase = pages.data?.pages[0]?.showcase;
  const heading = search.provedor ?? (kind ? kindDef(kind)!.label : title);
  const hasFilters = !!(
    search.q ||
    search.provedor ||
    search.tipo ||
    (!fixedCategory && search.cat)
  );

  // Carrega a próxima página sozinho quando o fim do grid aparece.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !pages.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !pages.isFetchingNextPage) pages.fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pages.hasNextPage, pages.isFetchingNextPage, pages.fetchNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <div className="max-sm:hidden">
        <CategoryNav active={nav} />
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-1 sm:gap-x-4 sm:pt-1">
        <h1 className="text-[24px] sm:text-[30px] md:text-[36px]">{heading}</h1>
        <p className="num pb-0.5 text-[13px] text-muted-foreground sm:pb-1 sm:text-[14px]">
          {pages.isLoading
            ? "Carregando…"
            : `${total.toLocaleString("pt-BR")} ${total === 1 ? "jogo" : "jogos"}`}
          {search.provedor && heading !== title && ` em ${title.toLowerCase()}`}
        </p>
      </div>

      <div className="catalog-bar">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="flex gap-2 md:contents">
            <label className="relative block min-w-0 flex-1 md:w-[320px] md:flex-none">
              <span className="sr-only">Buscar jogo</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar jogo"
                enterKeyHint="search"
                className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-10 text-[16px] outline-none placeholder:text-muted-foreground focus:border-primary sm:text-[15px]"
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
            <label className="flex shrink-0 items-center gap-2 md:order-last md:ml-auto">
              <span className="shrink-0 text-[13px] text-muted-foreground max-sm:sr-only">
                Ordenar
              </span>
              <select
                value={sort}
                onChange={(e) =>
                  onSearch({ ...search, ordem: e.target.value === "az" ? "az" : undefined })
                }
                className="h-11 w-[124px] rounded-[10px] border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary md:h-10 md:w-[150px]"
              >
                <option value="popular">Populares</option>
                <option value="az">De A a Z</option>
              </select>
            </label>
          </div>

          {!fixedCategory && (
            <div className="chip-row" role="tablist" aria-label="Tipo de jogo">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  data-active={category === c.id}
                  onClick={() =>
                    onSearch({ ...search, cat: c.id === "all" ? undefined : c.id, tipo: undefined })
                  }
                  className="chip shrink-0"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {category === "live" && (
            <div className="chip-row" role="tablist" aria-label="Tipo de mesa">
              <button
                type="button"
                role="tab"
                aria-selected={!kind}
                data-active={!kind}
                onClick={() => onSearch({ ...search, tipo: undefined })}
                className="chip shrink-0"
              >
                Todas as mesas
              </button>
              {GAME_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  aria-selected={kind === k.id}
                  data-active={kind === k.id}
                  onClick={() => onSearch({ ...search, tipo: k.id })}
                  className="chip shrink-0"
                >
                  {k.short}
                </button>
              ))}
            </div>
          )}
        </div>

        {(providers.data?.length ?? 0) > 1 && (
          <div className="chip-row mt-2.5" aria-label="Provedor">
            <button
              type="button"
              data-active={!search.provedor}
              aria-pressed={!search.provedor}
              onClick={() => onSearch({ ...search, provedor: undefined })}
              className="chip shrink-0"
            >
              Todos os provedores
            </button>
            {providers.data!.map((p) => (
              <button
                key={p.name}
                type="button"
                data-active={search.provedor === p.name}
                aria-pressed={search.provedor === p.name}
                onClick={() =>
                  onSearch({
                    ...search,
                    provedor: search.provedor === p.name ? undefined : p.name,
                  })
                }
                className="chip shrink-0"
              >
                {p.name}
                <span className="num ml-1.5 text-[12px] opacity-60">{p.games}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showcase && (
        <p className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[13px] text-muted-foreground sm:px-4 sm:py-3 sm:text-[14px]">
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
            {hasFilters && (
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
            )}
          </div>
        }
      />

      {pages.hasNextPage && (
        <div ref={sentinel} className={cn("flex flex-col items-center gap-2 pt-2")}>
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
