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
  "LIVE22",
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

const CRASH_PROVIDER_HINTS = [
  "SPRIBE",
  "JETX",
  "AVIATRIX",
  "TURBO GAMES",
  "GALAXSYS ORIGINAL",
  "SMARTSOFT",
  "ONLYPLAY",
];

const CRASH_EXCLUDED_PATTERNS = [
  /\bBIG\s+BASS\s+CRASH\b/,
  /\bCOYOTE\s+CRASH\b/,
  /\bCASH\s+OR\s+CRASH\b/,
];

const CRASH_BRAND_PATTERNS = [
  /\bAVIATOR\s?X?\b/,
  /\bAVIATRIX\b/,
  /\bSPACEMAN\b/,
  /\bJET\s?X\s?3?\b/,
  /\bCRASH\s?X\b/,
  /\bNINJA\s+CRASH\b/,
  /\bCRASH\s+GAME\b/,
  /\bAERO\b/,
  /\bAERONAUTS?\b/,
  /\bROCKETON\b/,
  /\bPUMPED\s?X\b/,
  /\bJAVELIN\s?X\b/,
];

const LIVE_PROVIDER_PRIORITY = [
  "EVOLUTION LIVE",
  "EZUGI",
  "PRAGMATIC LIVE",
  "LIVE88",
  "WINFINITY",
  "DREAMGAMING LIVE",
  "DREAM GAMING LIVE",
  "LIVE22",
];

const CRASH_PROVIDER_PATTERNS = [
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
  "RULETA",
  "BACCARAT",
  "BAC BO",
  "BLACKJACK",
  "BLACK JACK",
  "CRAZY TIME",
  "MONOPOLY",
  "DREAM CATCHER",
  "MEGA WHEEL",
  "LIGHTNING STORM",
  "SWEET BONANZA",
  "BOOM CITY",
  "DRAGON TIGER",
  "DRAGONTIGER",
  "SICBO",
  "SIC BO",
  "ANDAR BAHAR",
  "TEEN PATTI",
  "CASINO HOLD",
  "LIVE CASINO LOBBY",
];

const PG_PROVIDER_PRIORITY = [
  /\bPG\s?SOFT\b/,
  /\bPGSOFT\b/,
  /\bPOCKET\s+GAMES\s+SOFT\b/,
];

const SLOT_PRIORITY = [
  "FORTUNE TIGER",
  "FORTUNE RABBIT",
  "FORTUNE DRAGON",
  "FORTUNE OX",
  "FORTUNE SNAKE",
  "FORTUNE MOUSE",
  "TOURO SORTUDO",
  "TIGRE SORTUDO",
  "LUCKY NEKO",
  "MAHJONG WAYS 2",
  "MAHJONG WAYS",
  "TREASURES OF AZTEC",
  "WILD BOUNTY SHOWDOWN",
  "CAISHEN WINS",
  "PINATA WINS",
  "QUEEN OF BOUNTY",
  "GANESHA GOLD",
  "WAYS OF THE QILIN",
  "JURASSIC KINGDOM",
  "GEM SAVIOUR",
];

const LIVE_TYPE_GROUPS = [
  ["ROULETTE", "ROLETA", "RULETA", "ROULETA"],
  ["BACCARAT", "BAC BO"],
  ["BLACKJACK", "BLACK JACK"],
  ["CRAZY TIME", "MONOPOLY", "DREAM CATCHER", "MEGA WHEEL", "BOOM CITY", "LIGHTNING STORM", "SWEET BONANZA", "CASH OR CRASH", "STOCK MARKET"],
  ["DRAGON TIGER", "DRAGONTIGER"],
  ["SICBO", "SIC BO"],
  ["ANDAR BAHAR", "TEEN PATTI", "CASINO HOLD", "POKER", "CRAPS"],
];

function isLiveProvider(provider: string) {
  return LIVE_PROVIDER_HINTS.some((hint) => provider.includes(hint));
}

function isCrashProvider(provider: string) {
  return CRASH_PROVIDER_HINTS.some((hint) => provider.includes(hint));
}

function isCrashGame(provider: string, text: string) {
  if (CRASH_EXCLUDED_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (CRASH_BRAND_PATTERNS.some((pattern) => pattern.test(text))) return true;
  return isCrashProvider(provider) && CRASH_PROVIDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function getPFGameCategory(game: ClassifiablePFGame): PFGameCategory {
  const provider = normalize(game.provider.name);
  const name = normalize(game.name);
  const code = normalize(game.game_code);
  const text = `${name} ${code}`;

  if (isLiveProvider(provider)) return "live";
  if (isCrashGame(provider, text)) return "crash";
  return "slot";
}

function rankByTerms(game: ClassifiablePFGame, terms: string[]) {
  const name = normalize(game.name).replace(/\s+/g, " ");
  const compact = name.replace(/\s+/g, "");
  for (let index = 0; index < terms.length; index += 1) {
    const normalizedTerm = normalize(terms[index]).replace(/\s+/g, " ");
    const compactTerm = normalizedTerm.replace(/\s+/g, "");
    if (name === normalizedTerm || compact === compactTerm) return index * 3;
  }
  for (let index = 0; index < terms.length; index += 1) {
    const normalizedTerm = normalize(terms[index]).replace(/\s+/g, " ");
    const compactTerm = normalizedTerm.replace(/\s+/g, "");
    if (name.startsWith(`${normalizedTerm} `) || compact.startsWith(compactTerm)) return index * 3 + 1;
  }
  const index = terms.findIndex((term) => {
    const normalizedTerm = normalize(term).replace(/\s+/g, " ");
    return name.includes(normalizedTerm) || compact.includes(normalizedTerm.replace(/\s+/g, ""));
  });
  return index === -1 ? 999 : index * 3 + 2;
}

function getLiveTypeRank(game: ClassifiablePFGame) {
  const name = normalize(game.name).replace(/\s+/g, " ");
  const compact = name.replace(/\s+/g, "");
  const index = LIVE_TYPE_GROUPS.findIndex((terms) =>
    terms.some((term) => {
      const normalizedTerm = normalize(term).replace(/\s+/g, " ");
      return name.includes(normalizedTerm) || compact.includes(normalizedTerm.replace(/\s+/g, ""));
    }),
  );
  return index === -1 ? LIVE_TYPE_GROUPS.length : index;
}

function sortWithinCategory<T extends ClassifiablePFGame>(games: T[], terms: string[]) {
  return [...games].sort((a, b) => {
    const byRank = rankByTerms(a, terms) - rankByTerms(b, terms);
    if (byRank !== 0) return byRank;
    const byProvider = a.provider.name.localeCompare(b.provider.name, "pt-BR");
    if (byProvider !== 0) return byProvider;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function getProviderPriority(game: ClassifiablePFGame, providers: string[]) {
  const provider = normalize(game.provider.name);
  const index = providers.findIndex((term) => provider.includes(term));
  return index === -1 ? 999 : index;
}

function sortLiveGroup<T extends ClassifiablePFGame>(games: T[]) {
  return [...games].sort((a, b) => {
    const byProvider = getProviderPriority(a, LIVE_PROVIDER_PRIORITY) - getProviderPriority(b, LIVE_PROVIDER_PRIORITY);
    if (byProvider !== 0) return byProvider;
    const byRank = rankByTerms(a, LIVE_PRIORITY) - rankByTerms(b, LIVE_PRIORITY);
    if (byRank !== 0) return byRank;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function interleaveGroups<T>(groups: T[][]) {
  const queues = groups.map((group) => [...group]);
  const result: T[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        added = true;
      }
    }
  }
  return result;
}

function sortLiveGames<T extends ClassifiablePFGame>(games: T[]) {
  const groups = Array.from({ length: LIVE_TYPE_GROUPS.length + 1 }, () => [] as T[]);
  for (const game of games) groups[getLiveTypeRank(game)].push(game);
  return interleaveGroups(groups.map((group) => sortLiveGroup(group)));
}

function isPGSoftGame(game: ClassifiablePFGame) {
  const provider = normalize(game.provider.name);
  return PG_PROVIDER_PRIORITY.some((pattern) => pattern.test(provider));
}

function sortSlotGames<T extends ClassifiablePFGame>(games: T[]) {
  return [...games].sort((a, b) => {
    const byPGProvider = Number(isPGSoftGame(b)) - Number(isPGSoftGame(a));
    if (byPGProvider !== 0) return byPGProvider;
    const byRank = rankByTerms(a, SLOT_PRIORITY) - rankByTerms(b, SLOT_PRIORITY);
    if (byRank !== 0) return byRank;
    const byProvider = a.provider.name.localeCompare(b.provider.name, "pt-BR");
    if (byProvider !== 0) return byProvider;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function sortPFSectionGames<T extends ClassifiablePFGame>(games: T[], category: PFGameCategory) {
  if (category === "live") return sortLiveGames(games);
  if (category === "slot") return sortSlotGames(games);
  const terms = category === "crash" ? CRASH_PRIORITY : [];
  return sortWithinCategory(games, terms);
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
    slots: sortPFSectionGames(slots, "slot"),
  };
}