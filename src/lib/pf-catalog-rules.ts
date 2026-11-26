/**
 * Regras puras do catálogo: quais jogos entram, nome do provedor, categoria
 * e ordem padrão do lobby. Usado pela sincronização e testado sem rede.
 */
import { getPFGameCategory } from "./pf-game-classification";

/** Só provedores oficiais. A carteira de clones da PlayFivers nunca entra. */
export function isOfficialProvider(providerName: string): boolean {
  return /^\s*OFICIAL\s*-/i.test(providerName);
}

const PROVIDER_LABELS: [RegExp, string][] = [
  [/PG\s*SOFT|POCKET\s*GAMES/i, "PG Soft"],
  [/PRAGMATIC.*LIVE/i, "Pragmatic Live"],
  [/PRAGMATIC/i, "Pragmatic Play"],
  [/EVOLUTION/i, "Evolution"],
  [/EZUGI/i, "Ezugi"],
  [/SPRIBE/i, "Spribe"],
  [/JILI/i, "JILI"],
  [/TADA/i, "TaDa Gaming"],
  [/HABANERO/i, "Habanero"],
  [/JDB/i, "JDB"],
  [/SMART\s*SOFT|JETX/i, "SmartSoft"],
  [/HACKSAW/i, "Hacksaw"],
  [/NOLIMIT/i, "Nolimit City"],
  [/BGAMING/i, "BGaming"],
  [/PLAYTECH/i, "Playtech"],
  [/RELAX/i, "Relax Gaming"],
  [/RED\s*TIGER/i, "Red Tiger"],
  [/NETENT/i, "NetEnt"],
  [/GALAXSYS/i, "Galaxsys"],
  [/TURBO\s*GAMES/i, "Turbo Games"],
];

export function providerLabel(providerName: string): string {
  const clean = providerName.replace(/^\s*OFICIAL\s*-\s*/i, "").trim();
  for (const [re, label] of PROVIDER_LABELS) if (re.test(clean)) return label;
  return clean.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export type CatalogCategory = "slot" | "live" | "crash" | "table" | "other";

const TABLE_RE =
  /\b(BLACKJACK|POKER|BACCARAT|DRAGON\s*TIGER|SIC\s*BO|ROULETTE|ROLETA|CRAPS|TEEN\s*PATTI|ANDAR\s*BAHAR|HI.?LO)\b/i;

export function catalogCategory(
  name: string,
  providerName: string,
  gameCode: string,
): CatalogCategory {
  const base = getPFGameCategory({ name, game_code: gameCode, provider: { name: providerName } });
  if (base === "slot" && TABLE_RE.test(name)) return "table";
  return base;
}

/**
 * Ordem padrão do lobby com o que mais se joga no Brasil.
 * O admin pode mudar sort_order/featured depois; a sincronização não sobrescreve.
 */
export const TOP_GAMES: { match: RegExp; provider?: RegExp }[] = [
  // PG Soft
  { match: /^fortune tiger$/i, provider: /PG/i },
  { match: /^fortune rabbit$/i, provider: /PG/i },
  { match: /^fortune ox$/i, provider: /PG/i },
  { match: /^fortune mouse$/i, provider: /PG/i },
  { match: /^fortune dragon$/i, provider: /PG/i },
  { match: /^fortune snake$/i, provider: /PG/i },
  { match: /^mahjong ways 2$/i, provider: /PG/i },
  { match: /^mahjong ways$/i, provider: /PG/i },
  { match: /^wild bandito$/i, provider: /PG/i },
  { match: /^treasures of aztec$/i, provider: /PG/i },
  { match: /^lucky neko$/i, provider: /PG/i },
  { match: /^ganesha gold$/i, provider: /PG/i },
  { match: /^double fortune$/i, provider: /PG/i },
  { match: /^cash mania$/i, provider: /PG/i },
  { match: /^dragon hatch$/i, provider: /PG/i },
  { match: /^caishen wins$/i, provider: /PG/i },
  // Pragmatic
  { match: /^gates of olympus$/i, provider: /PRAGMATIC/i },
  { match: /^gates of olympus 1000$/i, provider: /PRAGMATIC/i },
  { match: /^sweet bonanza$/i, provider: /PRAGMATIC/i },
  { match: /^sweet bonanza 1000$/i, provider: /PRAGMATIC/i },
  { match: /^sugar rush$/i, provider: /PRAGMATIC/i },
  { match: /^sugar rush 1000$/i, provider: /PRAGMATIC/i },
  { match: /^big bass splash$/i, provider: /PRAGMATIC/i },
  { match: /^the dog house megaways$/i, provider: /PRAGMATIC/i },
  { match: /^starlight princess$/i, provider: /PRAGMATIC/i },
  { match: /^zeus vs hades/i, provider: /PRAGMATIC/i },
  { match: /tigre sortudo|lucky tiger/i, provider: /PRAGMATIC/i },
  // Crash
  { match: /^aviator$/i },
  { match: /^spaceman$/i },
  { match: /^jet\s?x$/i },
  { match: /^mines$/i, provider: /SPRIBE/i },
  { match: /^plinko$/i, provider: /SPRIBE/i },
  // Ao vivo
  { match: /roleta brasileira|brazilian roulette/i },
  { match: /^crazy time$/i },
  { match: /^bac bo/i },
  { match: /football studio|futebol studio/i },
  { match: /^lightning roulette$/i },
  { match: /^mega roulette/i },
  { match: /^speed baccarat/i },
  { match: /^monopoly live$/i },
  { match: /^dragon tiger$/i },
  { match: /^fan tan$/i },
  { match: /^mega wheel$/i },
  { match: /^sweet bonanza candyland$/i },
];

export const FEATURED_COUNT = 16;

/** Posição padrão: jogos da lista TOP vêm primeiro, na ordem da lista. */
export function defaultSortOrder(name: string, providerName: string): number {
  const idx = TOP_GAMES.findIndex(
    (t) => t.match.test(name.trim()) && (!t.provider || t.provider.test(providerName)),
  );
  return idx === -1 ? 1000 : (idx + 1) * 10;
}

export function hasArtwork(url: string | null | undefined): boolean {
  return /^https?:\/\/\S+\.(webp|png|jpe?g|avif|gif)(\?\S*)?$/i.test((url ?? "").trim());
}
