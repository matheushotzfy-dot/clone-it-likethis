/**
 * Registro de artes quebradas (URL existe, mas a imagem não carrega).
 * O primeiro carregamento marca o jogo; nas próximas listagens ele nem aparece,
 * então não sobra tile "sem foto" — problema comum nos crash games.
 */
const KEY = "pf-broken-art";
const MAX = 800;

const broken = new Set<string>(load());

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...broken].slice(-MAX)));
  } catch {
    /* cota cheia: registro é opcional */
  }
}

export function isBrokenArt(gameCode: string): boolean {
  return broken.has(gameCode);
}

export function markBrokenArt(gameCode: string): void {
  if (!gameCode || broken.has(gameCode)) return;
  broken.add(gameCode);
  persist();
}
