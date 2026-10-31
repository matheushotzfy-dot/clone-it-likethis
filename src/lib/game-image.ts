/** Missing or failed artwork must never leave a playable placeholder tile. */
export function hasGameImage(source: string | null | undefined, failed = false): boolean {
  return !failed && Boolean(source?.trim());
}