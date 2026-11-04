export interface GameAccessProfile {
  balance?: number | string | null;
  hasDeposited?: boolean;
}

/** Deposit history and playable balance are separate facts. */
export function canAccessGames(profile: GameAccessProfile | null | undefined): boolean {
  return !!profile?.hasDeposited;
}