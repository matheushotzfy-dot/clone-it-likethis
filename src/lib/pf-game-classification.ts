export interface ClassifiablePFGame {
  game_code: string;
  name: string;
  provider: { name: string };
}

export type PFGameCategory = "crash" | "live" | "slot";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

const LIVE_PROVIDER_HINTS = [
  "EVOLUTION LIVE",
  "PRAGMATIC LIVE",
  "EZUGI",
  "LIVE88",
  "DREAMGAMING LIVE",
  "DREAM GAMING LIVE",
  "WINFINITY",
  "BETGAMES",
  "ON AIR",
  "AUTHENTIC GAMING",
  "LUCKYSTREAK",
  "LUCKY STREAK",
  "VIVO GAMING",
  "ATMOSFERA",
  "BOMBAY LIVE",
  "ABSOLUTE LIVE",
];

const CRASH_PATTERNS = [
  /\bAVIATOR\b/,
  /\bAVIATRIX\b/,
  /\bSPACEMAN\b/,
  /\bJET\s?X\s?3?\b/,
  /\bCRASH\b/,
  /\bAERO\b/,
  /\bAERONAUTS?\b/,
  /\bBALLOON\b/,
  /\bGOAL\b/,
  /\bMINES?\b/,
  /\bPLINKO\b/,
  /\bLIMBO\b/,
  /\bTOWERS?\b/,
  /\bHI\s?LO\b/,
  /\bHILO\b/,
  /\bCOIN\s?FLIP\b/,
  /\bDICE\b/,
  /\bPENALTY\b/,
  /\bROCKET\b/,
  /\bPUMPED\s?X\b/,
  /\bJAVELIN\s?X\b/,
];

const CRASH_PRIORITY = [
  "AVIATOR",
  "SPACEMAN",
  "JETX",
  "JET X",
  "AVIATRIX",
  "CRASH",
  "AERO",
  "MINES",
  "PLINKO",
  "BALLOON",
  "GOAL",
  "LIMBO",
  "TOWERS",
  "HILO",
  "HI LO",
  "DICE",
];

const LIVE_PRIORITY = [
  "ROULETTE",
  "ROLETA",
  "BACCARAT",
  "BLACKJACK",
  "CRAZY TIME",
  "BOOM CITY",
  "DRAGON TIGER",
  "SICBO",
  "SIC BO",
  "ANDAR BAHAR",
  "TEEN PATTI",
  "CASINO HOLD",
  "LIVE CASINO LOBBY",
];

export function getPFGameCategory(game: ClassifiablePFGame): PFGameCategory {
  const provider = normalize(game.provider.name);
  const name = normalize(game.name);
  const code = normalize(game.game_code);
  const text = `${name} ${code}`;

  if (CRASH_PATTERNS.some((pattern) => pattern.test(text))) return "crash";
  if (LIVE_PROVIDER_HINTS.some((hint) => provider.includes(hint))) return "live";
  return "slot";
}

function rankByTerms(game: ClassifiablePFGame, terms: string[]) {
  const name = normalize(game.name).replace(/\s+/g, " ");
  const compact = name.replace(/\s+/g, "");
  const index = terms.findIndex((term) => {
    const normalizedTerm = normalize(term).replace(/\s+/g, " ");
    return name.includes(normalizedTerm) || compact.includes(normalizedTerm.replace(/\s+/g, ""));
  });
  return index === -1 ? 999 : index;
}

export function sortPFSectionGames<T extends ClassifiablePFGame>(games: T[], category: PFGameCategory) {
  const terms = category === "crash" ? CRASH_PRIORITY : category === "live" ? LIVE_PRIORITY : [];
  return [...games].sort((a, b) => {
    const byRank = rankByTerms(a, terms) - rankByTerms(b, terms);
    if (byRank !== 0) return byRank;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function splitPFGamesByCategory<T extends ClassifiablePFGame>(games: T[]) {
  const crash: T[] = [];
  const live: T[] = [];
  const slots: T[] = [];

  for (const game of games) {
    const category = getPFGameCategory(game);
    if (category === "crash") crash.push(game);
    else if (category === "live") live.push(game);
    else slots.push(game);
  }

  return {
    crash: sortPFSectionGames(crash, "crash"),
    live: sortPFSectionGames(live, "live"),
    slots,
  };
}