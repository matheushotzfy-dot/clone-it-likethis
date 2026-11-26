import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useLobby, usePlay, type LobbyGame } from "@/hooks/use-games";
import { cn } from "@/lib/utils";

/**
 * Busca do topo: mostra até 6 jogos enquanto digita (nome ou provedor).
 * Enter abre o catálogo com a busca completa.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const play = usePlay();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(term.trim()), 220);
    return () => clearTimeout(t);
  }, [term]);
  useEffect(() => setActive(-1), [query]);

  const results = useLobby({ q: query }, 6);
  const games: LobbyGame[] = query.length >= 2 ? (results.data?.games ?? []) : [];
  const total = results.data?.total ?? 0;
  const show = open && query.length >= 2;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function goAll() {
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    navigate({ to: "/cassino", search: { q } });
  }
  function pick(g: LobbyGame) {
    setOpen(false);
    setTerm("");
    play(g);
  }

  return (
    <form
      ref={box}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && games[active]) pick(games[active]);
        else goAll();
      }}
      className={cn("relative min-w-0", className)}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (!show || !games.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(games.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(-1, i - 1));
          }
        }}
        placeholder="Buscar jogo ou provedor"
        aria-label="Buscar jogo ou provedor"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-10 w-full rounded-[10px] border border-border bg-background pl-9 pr-9 text-[14px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
      {results.isFetching && query.length >= 2 && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {show && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[12px] border border-border bg-popover shadow-[0_18px_40px_rgb(0_0_0_/_0.45)]"
        >
          {results.isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-12 rounded-[8px]" />
              ))}
            </div>
          ) : games.length === 0 ? (
            <p className="px-4 py-5 text-[14px] text-muted-foreground">
              Nenhum jogo com “{query}”.
            </p>
          ) : (
            <>
              <ul className="p-1.5">
                {games.map((g, i) => (
                  <li key={g.id} role="option" aria-selected={active === i}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(g)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[8px] px-2 py-1.5 text-left",
                        active === i ? "bg-surface-2" : "hover:bg-surface",
                      )}
                    >
                      {g.image_url ? (
                        <img
                          src={g.image_url}
                          alt=""
                          width={30}
                          height={40}
                          className="h-10 w-[30px] shrink-0 rounded-[5px] object-cover"
                        />
                      ) : (
                        <span className="h-10 w-[30px] shrink-0 rounded-[5px] bg-surface-2" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">{g.name}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {g.provider}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goAll}
                className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-[13px] font-semibold text-primary hover:bg-surface"
              >
                Ver todos os resultados
                <span className="num text-muted-foreground">{total}</span>
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
