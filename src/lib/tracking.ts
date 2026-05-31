// Captura dados de rastreamento do navegador para o Pixel/Lookalike
export function getTrackingMetadata() {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const q = url.searchParams;
  const getCookie = (name: string) => {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  };
  return {
    referrer: document.referrer || "",
    signup_user_agent: navigator.userAgent || "",
    utm_source: q.get("utm_source") || "",
    utm_medium: q.get("utm_medium") || "",
    utm_campaign: q.get("utm_campaign") || "",
    utm_content: q.get("utm_content") || "",
    utm_term: q.get("utm_term") || "",
    fbp: getCookie("_fbp") || "",
    fbc: getCookie("_fbc") || q.get("fbclid") ? `fb.1.${Date.now()}.${q.get("fbclid")}` : "",
  };
}
