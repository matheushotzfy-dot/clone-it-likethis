/** Advertising identifier collection is disabled by the owner's explicit choice.
 * Do not access cookies, click IDs, referrers or user-agent data on signup.
 * The legacy caller remains compatible without forwarding tracking metadata.
 */
export function getTrackingMetadata(): Record<string, never> {
  return {};
}
