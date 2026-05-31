import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/esportes")({
  head: () => ({ meta: [{ title: "Esportes — PIXBET" }] }),
  component: Page,
});

const SPORTS_URL = "https://pix.bet.br/sports";

function Page() {
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { if (!loaded) setBlocked(true); }, 5000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <SiteShell>
      <div className="relative w-full" style={{ height: "calc(100vh - 56px)" }}>
        {!blocked ? (
          <iframe
            src={SPORTS_URL}
            title="Esportes"
            onLoad={() => setLoaded(true)}
            className="w-full h-full border-0 bg-background"
            allow="payment; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
            <h2 className="text-2xl font-bold">O provedor bloqueou o carregamento incorporado</h2>
            <p className="text-muted-foreground max-w-md">
              A página de esportes não permite ser exibida dentro de outro site (X-Frame-Options).
              Abra em nova aba para apostar.
            </p>
            <a
              href={SPORTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-md bg-primary text-primary-foreground font-bold hover:brightness-110"
            >
              <ExternalLink className="size-4" /> Abrir Esportes em nova aba
            </a>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
