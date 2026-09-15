import type { PFGameLite } from "@/hooks/use-pf-launch";

/**
 * Cache local do catálogo no navegador: a primeira visita paga a espera da
 * provedora, as seguintes pintam a tela na hora e revalidam em background.
 */
const PREFIX = "pf-catalog:";
const MAX_AGE = 30 * 60_000;

interface Entry {
  at: number;
  games: PFGameLite[];
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCatalogCache(key: string): Entry | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (!Array.isArray(parsed?.games) || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > MAX_AGE) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCatalogCache(key: string, games: PFGameLite[]) {
  const store = storage();
  if (!store || games.length === 0) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), games } satisfies Entry));
  } catch {
    /* cota cheia: cache é opcional */
  }
}
