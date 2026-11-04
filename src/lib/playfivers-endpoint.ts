/**
 * Resolves where PlayFivers requests are sent.
 *
 * PlayFivers only accepts requests from allow-listed IPs, but the site's
 * server has no fixed outbound IP. When a fixed-IP relay is configured
 * (PLAYFIVERS_PROXY_URL + PLAYFIVERS_PROXY_KEY), every call goes through it;
 * otherwise calls go straight to PlayFivers.
 */
export const PF_DIRECT_BASE = "https://api.playfivers.com";

export interface PFEndpoint {
  base: string;
  headers: Record<string, string>;
  viaProxy: boolean;
}

export function resolvePFEndpoint(proxyUrl: string | undefined, proxyKey: string | undefined): PFEndpoint {
  const url = proxyUrl?.trim();
  const key = proxyKey?.trim();
  // A relay without its key would be rejected anyway; fall back to direct.
  if (!url || !key || !/^https?:\/\//i.test(url)) {
    return { base: PF_DIRECT_BASE, headers: {}, viaProxy: false };
  }
  return { base: url.replace(/\/+$/, ""), headers: { "X-Proxy-Key": key }, viaProxy: true };
}
