/**
 * Tipos de jogo usados para organizar o lobby (seções, sidebar e filtros).
 * São derivados do nome e da categoria, então valem tanto para a vitrine
 * quanto para o catálogo sincronizado da PlayFivers, sem coluna nova.
 */

export type GameKind = "roulette" | "gameshow" | "baccarat" | "blackjack";

export interface KindDef {
  id: GameKind;
  label: string;
  /** Rótulo curto para chips e sidebar. */
  short: string;
  /** Trechos de nome (sem acento, minúsculo) que identificam o tipo. */
  patterns: string[];
}

export const GAME_KINDS: KindDef[] = [
  {
    id: "roulette",
    label: "Roletas ao vivo",
    short: "Roletas",
    patterns: ["roulette", "roleta", "ruleta"],
  },
  {
    id: "gameshow",
    label: "Game shows",
    short: "Game shows",
    patterns: [
      "crazy time",
      "crazy pachinko",
      "monopoly",
      "dream catcher",
      "deal or no deal",
      "funky time",
      "lightning storm",
      "mega wheel",
      "mega ball",
      "mega bola",
      "ice fishing",
      "cash or crash",
      "gonzo",
      "wonderland",
      "spin a win",
      "football studio",
      "futebol studio",
      "football blitz",
      "super trunfo",
      "sweet bonanza candyland",
      "treasure island",
    ],
  },
  {
    id: "baccarat",
    label: "Baccarat e Bac Bo",
    short: "Baccarat",
    patterns: ["baccarat", "bac bo", "dragon tiger", "fan tan"],
  },
  {
    id: "blackjack",
    label: "Blackjack",
    short: "Blackjack",
    patterns: ["blackjack"],
  },
];

export function kindDef(id: string | undefined): KindDef | undefined {
  return GAME_KINDS.find((k) => k.id === id);
}

function plain(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Tipo de um jogo pelo nome; jogos fora desses tipos ficam sem tipo. */
export function gameKind(name: string): GameKind | null {
  const n = plain(name);
  for (const k of GAME_KINDS) if (k.patterns.some((p) => n.includes(p))) return k.id;
  return null;
}

/** Filtro PostgREST (`or`) que casa os nomes de um tipo. */
export function kindOrFilter(id: GameKind): string {
  const def = kindDef(id)!;
  return def.patterns.map((p) => `name.ilike.%${p.replace(/[,()%_]/g, " ")}%`).join(",");
}
